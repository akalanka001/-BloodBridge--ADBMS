-- BloodBridge Advanced Database Concepts | PostgreSQL 16+ | migration 007
-- Prerequisites: run 001_schema.sql and 002_seed_reference.sql on the OLTP database.
-- This is an educational, synthetic-data system, NOT a validated clinical service.
-- Transactional DDL: migration either installs all these objects or none.
BEGIN;

-- ============================================================
-- 1. NORMAL VIEWS: stored SQL queries, current OLTP information
-- ============================================================
CREATE VIEW v_available_blood_stock AS
SELECT bu.blood_bank_id, bb.name AS blood_bank_name,
       bu.blood_type_code, bu.component_code, count(*)::bigint AS available_units,
       min(bu.expires_at) AS earliest_expiry
FROM blood_units bu
JOIN blood_banks bb ON bb.id = bu.blood_bank_id
WHERE bu.release_status = 'RELEASED'
  AND bu.inventory_status = 'IN_STOCK'
  AND bu.expires_at > now()
GROUP BY bu.blood_bank_id, bb.name, bu.blood_type_code, bu.component_code;

-- Public view intentionally excludes donors, patient details and private addresses.
CREATE VIEW v_public_donation_camps AS
SELECT c.id AS camp_id, c.title, c.starts_at, c.ends_at,
       c.capacity, c.public_contact,
       b.name AS coordinating_blood_bank,
       l.town, l.address_line AS venue_address,
       l.latitude AS venue_latitude, l.longitude AS venue_longitude,
       l.district_code, di.name AS district_name, l.ds_code
FROM donation_camps c
JOIN blood_banks b ON b.id = c.blood_bank_id
JOIN locations l ON l.id = c.location_id
JOIN districts di ON di.code = l.district_code
WHERE c.status = 'APPROVED' AND c.ends_at > now();

-- Request overview: aggregates reservations at item level to prevent join multiplication.
CREATE VIEW v_request_fulfillment_progress AS
SELECT br.id AS request_id, br.hospital_id, br.status,
       sum(ri.units_requested)::bigint AS requested_units,
       sum((SELECT count(*) FROM inventory_reservations r
            WHERE r.request_item_id = ri.id AND r.status = 'ACTIVE'))::bigint AS reserved_units,
       sum((SELECT count(*) FROM inventory_reservations r
            WHERE r.request_item_id = ri.id AND r.status = 'FULFILLED'))::bigint AS fulfilled_units
FROM blood_requests br
JOIN request_items ri ON ri.request_id = br.id
GROUP BY br.id, br.hospital_id, br.status;

CREATE VIEW v_camp_registration_summary AS
SELECT c.id AS camp_id, c.title,
       count(cr.id) FILTER (WHERE cr.status = 'REGISTERED') AS registered,
       count(cr.id) FILTER (WHERE cr.status = 'ATTENDED') AS attended,
       count(cr.id) FILTER (WHERE cr.status = 'NO_SHOW') AS no_show
FROM donation_camps c
LEFT JOIN camp_registrations cr ON cr.camp_id = c.id
GROUP BY c.id, c.title;

-- ============================================================
-- 2. SQL USER-DEFINED FUNCTION: reusable operational query
-- ============================================================
CREATE FUNCTION fn_available_unit_count(
    p_blood_bank_id BIGINT, p_blood_type_code TEXT, p_component_code TEXT
) RETURNS BIGINT
LANGUAGE SQL STABLE AS $$
    SELECT count(*) FROM blood_units u
    WHERE u.blood_bank_id = p_blood_bank_id
      AND u.blood_type_code = p_blood_type_code
      AND u.component_code = p_component_code
      AND u.release_status = 'RELEASED'
      AND u.inventory_status = 'IN_STOCK'
      AND u.expires_at > now();
$$;

-- Search camps by district without exposing private donor data.
CREATE FUNCTION fn_camps_in_district(p_district_code TEXT)
RETURNS TABLE(camp_id UUID, title TEXT, starts_at TIMESTAMPTZ, town TEXT)
LANGUAGE SQL STABLE AS $$
    SELECT c.camp_id, c.title, c.starts_at, c.town
    FROM v_public_donation_camps c
    WHERE c.district_code = p_district_code
    ORDER BY c.starts_at;
$$;

-- ============================================================
-- 3. PL/pgSQL STORED PROCEDURE: verified camp approval
--    CALL sp_approve_donation_camp(camp_uuid, staff_user_uuid);
-- ============================================================
CREATE PROCEDURE sp_approve_donation_camp(p_camp_id UUID, p_staff_user_id UUID)
LANGUAGE plpgsql AS $$
DECLARE
  v_camp donation_camps%ROWTYPE;
BEGIN
  SELECT * INTO v_camp
  FROM donation_camps WHERE id = p_camp_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Camp does not exist' USING ERRCODE = 'P0002';
  END IF;
  IF v_camp.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only a PENDING camp can be approved' USING ERRCODE = '23514';
  END IF;
  IF v_camp.starts_at <= now() THEN
    RAISE EXCEPTION 'Cannot approve a camp after it begins' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM staff_memberships sm
    JOIN users u ON u.id = sm.user_id
    JOIN blood_banks b ON b.id = sm.blood_bank_id
    WHERE u.id = p_staff_user_id AND u.role = 'BANK_STAFF' AND u.is_active
      AND sm.is_active AND sm.blood_bank_id = v_camp.blood_bank_id
      AND b.is_verified
  ) THEN
    RAISE EXCEPTION 'User is not authorized for the verified coordinating bank'
      USING ERRCODE = '42501';
  END IF;
  UPDATE donation_camps SET status = 'APPROVED', approved_by = p_staff_user_id
  WHERE id = p_camp_id;
  INSERT INTO audit_logs(actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'donation_camps', p_camp_id::text, 'APPROVE');
  -- No COMMIT in procedure: API transaction owns commit/rollback.
END;
$$;

-- ============================================================
-- 4. TRIGGER FUNCTION / TRIGGER: camp registration safeguards
--    Lock camp to serialize capacity checks during simultaneous signups.
-- ============================================================
CREATE FUNCTION fn_trg_check_camp_registration()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_status TEXT;
  v_start TIMESTAMPTZ;
  v_capacity INTEGER;
  v_registered BIGINT;
BEGIN
  -- Attendance, cancellation and no-show changes remain allowed after start.
  IF NEW.status <> 'REGISTERED'
     OR (TG_OP = 'UPDATE' AND OLD.status = 'REGISTERED'
         AND OLD.camp_id = NEW.camp_id) THEN
    RETURN NEW;
  END IF;
  SELECT status, starts_at, capacity
  INTO v_status, v_start, v_capacity
  FROM donation_camps WHERE id = NEW.camp_id FOR UPDATE;
  IF NOT FOUND OR v_status <> 'APPROVED' OR v_start <= now() THEN
    RAISE EXCEPTION 'Camp must be approved and upcoming to accept registrations'
      USING ERRCODE = '23514';
  END IF;
  IF v_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_registered FROM camp_registrations cr
    WHERE cr.camp_id = NEW.camp_id
      AND cr.status = 'REGISTERED' AND cr.id IS DISTINCT FROM NEW.id;
    IF v_registered >= v_capacity THEN
      RAISE EXCEPTION 'Camp registration capacity reached' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_camp_registration
BEFORE INSERT OR UPDATE OF camp_id, status ON camp_registrations
FOR EACH ROW EXECUTE FUNCTION fn_trg_check_camp_registration();

-- ============================================================
-- 5. TRIGGER: inventory movement audit, within same transaction
-- ============================================================
CREATE FUNCTION fn_trg_log_blood_unit_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_actor_text TEXT;
  v_actor UUID;
BEGIN
  v_actor_text := current_setting('app.actor_id', TRUE);
  IF v_actor_text IS NOT NULL AND v_actor_text <> '' THEN
    v_actor := v_actor_text::uuid;
  END IF;
  INSERT INTO inventory_movements(blood_unit_id, from_status, to_status, action, acted_by)
  VALUES (NEW.id, OLD.inventory_status, NEW.inventory_status,
          'STATUS_CHANGE', v_actor);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_blood_unit_status
AFTER UPDATE OF inventory_status ON blood_units
FOR EACH ROW
WHEN (OLD.inventory_status IS DISTINCT FROM NEW.inventory_status)
EXECUTE FUNCTION fn_trg_log_blood_unit_status();

-- ============================================================
-- 6. TRANSACTION-SAFE FUNCTION: reserve one released component unit
--    Call in a transaction; do NOT also insert an inventory movement in API.
-- ============================================================
CREATE FUNCTION fn_reserve_blood_unit(
    p_request_item_id UUID, p_blood_unit_id UUID, p_staff_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_item RECORD;
  v_unit blood_units%ROWTYPE;
  v_already_reserved BIGINT;
  v_reservation_id UUID;
BEGIN
  -- Lock request and item first; competing reservations serialize here.
  SELECT ri.blood_type_code, ri.component_code, ri.units_requested,
         br.status AS request_status
  INTO v_item FROM request_items ri
  JOIN blood_requests br ON br.id = ri.request_id
  WHERE ri.id = p_request_item_id FOR UPDATE OF ri, br;
  IF NOT FOUND OR v_item.request_status NOT IN ('OPEN','PARTIALLY_FILLED') THEN
    RAISE EXCEPTION 'No open request item found' USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO v_already_reserved FROM inventory_reservations r
  WHERE r.request_item_id = p_request_item_id
    AND r.status IN ('ACTIVE', 'FULFILLED');
  IF v_already_reserved >= v_item.units_requested THEN
    RAISE EXCEPTION 'Request item already fully allocated' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_unit FROM blood_units
  WHERE id = p_blood_unit_id FOR UPDATE;
  IF NOT FOUND
     OR v_unit.blood_type_code <> v_item.blood_type_code
     OR v_unit.component_code <> v_item.component_code
     OR v_unit.release_status <> 'RELEASED'
     OR v_unit.inventory_status <> 'IN_STOCK'
     OR v_unit.expires_at <= now() THEN
    RAISE EXCEPTION 'Requested blood component is not available'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM staff_memberships sm JOIN users u ON u.id = sm.user_id
    WHERE sm.user_id = p_staff_user_id AND sm.blood_bank_id = v_unit.blood_bank_id
      AND sm.is_active AND u.is_active AND u.role = 'BANK_STAFF'
  ) THEN
    RAISE EXCEPTION 'Not authorized to reserve stock at this bank'
      USING ERRCODE = '42501';
  END IF;

  -- Triggers use actor only for the current transaction; no external session leak.
  PERFORM set_config('app.actor_id', p_staff_user_id::text, TRUE);
  UPDATE blood_units SET inventory_status = 'RESERVED'
  WHERE id = p_blood_unit_id;
  INSERT INTO inventory_reservations(request_item_id,blood_unit_id,reserved_by)
  VALUES (p_request_item_id,p_blood_unit_id,p_staff_user_id)
  RETURNING id INTO v_reservation_id;
  RETURN v_reservation_id;
  -- Any exception rolls back both reservation and status/audit writes.
END;
$$;

-- ============================================================
-- 7. MATERIALIZED VIEW: reporting snapshot (explicit refresh needed)
-- ============================================================
CREATE MATERIALIZED VIEW mv_monthly_donation_counts AS
SELECT date_trunc('month', d.collected_at AT TIME ZONE 'Asia/Colombo')::date
         AS month_start,
       l.district_code, d.blood_bank_id,
       count(*)::bigint AS donation_count
FROM donations d
JOIN blood_banks bb ON bb.id = d.blood_bank_id
JOIN locations l ON l.id = bb.location_id
GROUP BY 1, 2, 3
WITH DATA;

CREATE UNIQUE INDEX uq_mv_monthly_donations
  ON mv_monthly_donation_counts(month_start,district_code,blood_bank_id);

COMMIT;

-- Read-only usage examples (uncomment after seeding operational data):
-- SELECT * FROM v_available_blood_stock;
-- SELECT * FROM v_public_donation_camps;
-- SELECT * FROM v_request_fulfillment_progress;
-- SELECT * FROM v_camp_registration_summary;
-- SELECT fn_available_unit_count(1,'O-','RBC');
-- SELECT * FROM fn_camps_in_district('CO');
-- BEGIN;
-- CALL sp_approve_donation_camp('CAMP_UUID'::uuid, 'BANK_STAFF_UUID'::uuid);
-- COMMIT;
-- BEGIN;
-- SELECT fn_reserve_blood_unit('REQUEST_ITEM_UUID'::uuid,
--                               'BLOOD_UNIT_UUID'::uuid, 'BANK_STAFF_UUID'::uuid);
-- COMMIT;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_donation_counts;

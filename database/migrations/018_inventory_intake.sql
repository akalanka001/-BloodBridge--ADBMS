-- BloodBridge Donor Intake, Inventory & Inter-Bank Transfers | PostgreSQL 16+ | migration 018
-- Aligned with Member 4 requirements: inventory control, release transitions, component processing, and dashboard views.

-- 1. Schema Extensions
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS volume_ml INT DEFAULT 450;
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_blood_units_bank_status_exp ON blood_units(blood_bank_id, release_status, inventory_status, expires_at);
CREATE INDEX IF NOT EXISTS idx_donations_bank_time ON donations(blood_bank_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_time ON inventory_movements(acted_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON blood_bank_transfers(status, source_bank_id, target_bank_id);

-- 3. Stored Procedure: Release or Reject Quarantined Blood Unit
CREATE OR REPLACE PROCEDURE sp_release_blood_unit(
  p_unit_id UUID,
  p_staff_user_id UUID,
  p_release_status TEXT, -- 'RELEASED' or 'REJECTED'
  p_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_unit RECORD;
BEGIN
  IF p_release_status NOT IN ('RELEASED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid release status % (must be RELEASED or REJECTED)', p_release_status USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_unit
  FROM blood_units
  WHERE id = p_unit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Blood unit % not found', p_unit_id USING ERRCODE = 'P0002';
  END IF;

  IF v_unit.release_status <> 'QUARANTINED' THEN
    RAISE EXCEPTION 'Unit % is already in release status %', p_unit_id, v_unit.release_status USING ERRCODE = '23514';
  END IF;

  -- Verify staff authorization at unit's blood bank
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_staff_user_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_staff_user_id AND blood_bank_id = v_unit.blood_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Staff % is not authorized to release units for blood bank %', p_staff_user_id, v_unit.blood_bank_id USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.actor_id', p_staff_user_id::text, TRUE);

  IF p_release_status = 'RELEASED' THEN
    UPDATE blood_units
    SET release_status = 'RELEASED',
        released_by = p_staff_user_id,
        released_at = now()
    WHERE id = p_unit_id;
  ELSE
    UPDATE blood_units
    SET release_status = 'REJECTED',
        inventory_status = 'DISCARDED',
        released_by = p_staff_user_id,
        released_at = now()
    WHERE id = p_unit_id;
  END IF;

  INSERT INTO inventory_movements (blood_unit_id, from_status, to_status, action, acted_by)
  VALUES (p_unit_id, v_unit.release_status, p_release_status, 'RELEASE_' || p_release_status, p_staff_user_id);

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'blood_units', p_unit_id::text, 'RELEASE_STATUS_' || p_release_status);

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'BLOOD_UNIT_' || p_release_status,
    'blood_units',
    p_unit_id::text,
    jsonb_build_object(
      'unitId', p_unit_id,
      'releaseStatus', p_release_status,
      'releasedBy', p_staff_user_id,
      'notes', p_notes
    )
  );
END;
$$;

-- 4. Stored Procedure: Process Donation into Component Units
CREATE OR REPLACE PROCEDURE sp_process_donation_components(
  p_donation_id UUID,
  p_staff_user_id UUID,
  p_components JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_donation RECORD;
  v_comp RECORD;
  v_donor_blood_type TEXT;
  v_unit_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Lock donation
  SELECT d.*, don.blood_type_code AS donor_blood_type
  INTO v_donation
  FROM donations d
  JOIN donors don ON don.id = d.donor_id
  WHERE d.id = p_donation_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation % not found', p_donation_id USING ERRCODE = 'P0002';
  END IF;

  IF v_donation.process_status <> 'COLLECTED' THEN
    RAISE EXCEPTION 'Donation % is in status %, cannot process (must be COLLECTED)',
      p_donation_id, v_donation.process_status USING ERRCODE = '23514';
  END IF;

  -- Verify staff authorization
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_staff_user_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_staff_user_id AND blood_bank_id = v_donation.blood_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Staff % is not authorized for blood bank %', p_staff_user_id, v_donation.blood_bank_id USING ERRCODE = '42501';
  END IF;

  -- Determine blood type
  v_donor_blood_type := v_donation.donor_blood_type;
  IF v_donor_blood_type IS NULL THEN
    RAISE EXCEPTION 'Cannot process donation %: donor blood type is not verified', p_donation_id USING ERRCODE = '23514';
  END IF;

  -- Iterate through components
  FOR v_comp IN
    SELECT
      elem->>'componentCode' AS component_code,
      COALESCE((elem->>'volumeMl')::int, 450) AS volume_ml,
      COALESCE((elem->>'daysValid')::int,
        CASE elem->>'componentCode'
          WHEN 'PLATELETS' THEN 5
          WHEN 'RBC' THEN 35
          WHEN 'PLASMA' THEN 365
          ELSE 35
        END
      ) AS days_valid
    FROM jsonb_array_elements(p_components) AS elem
  LOOP
    v_expires_at := v_donation.collected_at + (v_comp.days_valid || ' days')::interval;
    v_unit_id := gen_random_uuid();

    INSERT INTO blood_units (
      id, donation_id, blood_bank_id, blood_type_code, component_code,
      collected_at, expires_at, release_status, inventory_status, volume_ml
    )
    VALUES (
      v_unit_id, p_donation_id, v_donation.blood_bank_id, v_donor_blood_type, v_comp.component_code,
      v_donation.collected_at, v_expires_at, 'QUARANTINED', 'IN_STOCK', v_comp.volume_ml
    );
  END LOOP;

  -- Update donation status
  UPDATE donations
  SET process_status = 'PROCESSED'
  WHERE id = p_donation_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'donations', p_donation_id::text, 'PROCESS_COMPONENTS');

  -- Outbox event
  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'DONATION_PROCESSED',
    'donations',
    p_donation_id::text,
    jsonb_build_object(
      'donationId', p_donation_id,
      'bloodBankId', v_donation.blood_bank_id,
      'processedBy', p_staff_user_id,
      'components', p_components
    )
  );
END;
$$;

-- 5. Operational View: Blood Bank Dashboard KPIs
CREATE OR REPLACE VIEW v_blood_bank_dashboard_kpis AS
SELECT
  bb.id AS blood_bank_id,
  bb.name AS blood_bank_name,
  -- Available released units
  COALESCE((
    SELECT count(*)::int
    FROM blood_units bu
    WHERE bu.blood_bank_id = bb.id
      AND bu.release_status = 'RELEASED'
      AND bu.inventory_status = 'IN_STOCK'
      AND bu.expires_at > now()
  ), 0)::int AS available_units,
  -- Expiring soon (within 7 days)
  COALESCE((
    SELECT count(*)::int
    FROM blood_units bu
    WHERE bu.blood_bank_id = bb.id
      AND bu.release_status = 'RELEASED'
      AND bu.inventory_status = 'IN_STOCK'
      AND bu.expires_at > now()
      AND bu.expires_at <= now() + interval '7 days'
  ), 0)::int AS expiring_soon,
  -- Pending incoming requests (active requests in network)
  COALESCE((
    SELECT count(*)::int
    FROM blood_requests br
    WHERE br.status IN ('OPEN', 'PARTIALLY_FILLED')
  ), 0)::int AS incoming_requests,
  -- Today's completed collections
  COALESCE((
    SELECT count(*)::int
    FROM donations d
    WHERE d.blood_bank_id = bb.id
      AND d.collected_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Colombo')
  ), 0)::int AS today_collections,
  -- In-transit transfers
  COALESCE((
    SELECT count(*)::int
    FROM blood_bank_transfers bbt
    WHERE (bbt.source_bank_id = bb.id OR bbt.target_bank_id = bb.id)
      AND bbt.status = 'IN_TRANSIT'
  ), 0)::int AS in_transit_transfers,
  -- Approved upcoming camps
  COALESCE((
    SELECT count(*)::int
    FROM donation_camps dc
    WHERE dc.blood_bank_id = bb.id
      AND dc.status = 'APPROVED'
      AND dc.starts_at > now()
  ), 0)::int AS upcoming_camps
FROM blood_banks bb;

-- 6. Operational View: Detailed Inventory Units
CREATE OR REPLACE VIEW v_blood_bank_inventory_units AS
SELECT
  bu.id,
  bu.donation_id,
  bu.blood_bank_id,
  bb.name AS blood_bank_name,
  bu.blood_type_code,
  bu.component_code,
  bu.volume_ml,
  bu.release_status,
  bu.inventory_status,
  bu.collected_at,
  bu.expires_at,
  bu.released_by,
  u.full_name AS released_by_name,
  bu.released_at,
  bu.created_at,
  CASE
    WHEN bu.expires_at <= now() THEN 0
    ELSE CEIL(EXTRACT(EPOCH FROM (bu.expires_at - now())) / 86400.0)::int
  END AS days_left,
  ROUND(EXTRACT(EPOCH FROM (bu.expires_at - now())) / 3600.0, 1) AS hours_left
FROM blood_units bu
JOIN blood_banks bb ON bb.id = bu.blood_bank_id
LEFT JOIN users u ON u.id = bu.released_by;

-- 7. Operational View: Inventory Movements History Detail
CREATE OR REPLACE VIEW v_inventory_movements_detail AS
SELECT
  im.id,
  im.blood_unit_id,
  bu.blood_bank_id,
  bb.name AS blood_bank_name,
  bu.blood_type_code,
  bu.component_code,
  im.from_status,
  im.to_status,
  im.action,
  im.acted_by,
  u.full_name AS actor_name,
  im.acted_at
FROM inventory_movements im
JOIN blood_units bu ON bu.id = im.blood_unit_id
JOIN blood_banks bb ON bb.id = bu.blood_bank_id
LEFT JOIN users u ON u.id = im.acted_by;

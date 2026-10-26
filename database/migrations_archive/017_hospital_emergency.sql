-- BloodBridge Migration 017: Hospital Requests, Emergency Appeals & Fulfillment Tracking
-- Implemented for Member 3: Hospital Staff Dashboard & Emergency Coordination

BEGIN;

-- 1. Extend fulfillments table with receipt tracking fields
ALTER TABLE fulfillments
  ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS condition_notes TEXT;

ALTER TABLE fulfillments
  DROP CONSTRAINT IF EXISTS fulfillments_received_quantity_check;

ALTER TABLE fulfillments
  ADD CONSTRAINT fulfillments_received_quantity_check
  CHECK (received_quantity IS NULL OR received_quantity > 0);

-- 2. Emergency Appeals Table
CREATE TABLE IF NOT EXISTS emergency_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  request_item_id UUID NOT NULL REFERENCES request_items(id) ON DELETE CASCADE,
  hospital_id BIGINT NOT NULL REFERENCES hospitals(id),
  created_by UUID NOT NULL REFERENCES users(id),
  shortage_units INTEGER NOT NULL CHECK (shortage_units > 0),
  reason TEXT NOT NULL,
  scope_code TEXT,
  escalation_level TEXT NOT NULL DEFAULT 'GN_DIVISION'
    CHECK (escalation_level IN ('GN_DIVISION', 'DS_DIVISION', 'DISTRICT', 'PROVINCE', 'NATIONAL')),
  status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED')),
  target_blood_type TEXT NOT NULL REFERENCES blood_types(code),
  target_component_code TEXT NOT NULL REFERENCES component_types(code),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergency_appeals_hospital
  ON emergency_appeals(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_appeals_status
  ON emergency_appeals(status, created_at DESC) WHERE status IN ('PENDING_APPROVAL', 'APPROVED', 'ACTIVE');

-- 3. Appeal Escalation Steps (Tracking geographic expansion stages)
CREATE TABLE IF NOT EXISTS appeal_escalation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id UUID NOT NULL REFERENCES emergency_appeals(id) ON DELETE CASCADE,
  stage_order INT NOT NULL,
  stage_name TEXT NOT NULL
    CHECK (stage_name IN ('GN_DIVISION', 'DS_DIVISION', 'DISTRICT', 'PROVINCE', 'NATIONAL')),
  geo_code TEXT,
  candidates_identified INT NOT NULL DEFAULT 0,
  invitations_sent INT NOT NULL DEFAULT 0,
  responses_interested INT NOT NULL DEFAULT 0,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appeal_escalation_steps_appeal
  ON appeal_escalation_steps(appeal_id, stage_order ASC);

-- 4. Request Status History Table
CREATE TABLE IF NOT EXISTS request_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_status_history_request
  ON request_status_history(request_id, changed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_appeal_escalation_stage
  ON appeal_escalation_steps(appeal_id, stage_order);

CREATE INDEX IF NOT EXISTS idx_blood_requests_hospital_urgency_date
  ON blood_requests(hospital_id, urgency, needed_by)
  WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

-- 5. Trigger Function: Log Request Status Changes
CREATE OR REPLACE FUNCTION fn_audit_blood_request_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor_text TEXT;
  v_actor UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_actor_text := current_setting('app.actor_id', TRUE);
    IF v_actor_text IS NOT NULL AND v_actor_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_actor := v_actor_text::uuid;
    END IF;

    INSERT INTO request_status_history (request_id, from_status, to_status, changed_by, reason, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, v_actor, 'Status update via operational procedure', now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_blood_request_status ON blood_requests;
CREATE TRIGGER trg_audit_blood_request_status
AFTER UPDATE OF status ON blood_requests
FOR EACH ROW
EXECUTE FUNCTION fn_audit_blood_request_status();

-- 6. Operational Procedure: Safe Blood Request Cancellation
CREATE OR REPLACE PROCEDURE sp_cancel_blood_request(
  p_request_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT 'Cancelled by authorized hospital staff'
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_req RECORD;
  v_res RECORD;
BEGIN
  -- Lock request
  SELECT id, hospital_id, status
  INTO v_req
  FROM blood_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Blood request not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_req.status = 'FULFILLED' THEN
    RAISE EXCEPTION 'Cannot cancel an already fulfilled blood request' USING ERRCODE = '23514';
  END IF;

  IF v_req.status = 'CANCELLED' THEN
    RETURN; -- Idempotent
  END IF;

  -- Set actor config for audit triggers
  PERFORM set_config('app.actor_id', p_user_id::text, TRUE);

  -- 1. Cancel active reservations and release blood units back to IN_STOCK
  FOR v_res IN
    SELECT ir.id AS res_id, ir.blood_unit_id
    FROM inventory_reservations ir
    JOIN request_items ri ON ri.id = ir.request_item_id
    WHERE ri.request_id = p_request_id AND ir.status = 'ACTIVE'
    FOR UPDATE OF ir
  LOOP
    UPDATE inventory_reservations
    SET status = 'CANCELLED'
    WHERE id = v_res.res_id;

    UPDATE blood_units
    SET inventory_status = 'IN_STOCK'
    WHERE id = v_res.blood_unit_id AND inventory_status = 'RESERVED';
  END LOOP;

  -- 2. Update request status to CANCELLED
  UPDATE blood_requests
  SET status = 'CANCELLED'
  WHERE id = p_request_id;

  -- 3. Cancel any open emergency appeals
  UPDATE emergency_appeals
  SET status = 'CANCELLED', updated_at = now()
  WHERE request_id = p_request_id AND status IN ('PENDING_APPROVAL', 'APPROVED', 'ACTIVE');

  -- 4. Emit event to outbox
  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'blood_request:cancelled',
    'blood_requests',
    p_request_id::text,
    jsonb_build_object(
      'requestId', p_request_id,
      'hospitalId', v_req.hospital_id,
      'cancelledBy', p_user_id,
      'reason', p_reason,
      'timestamp', now()
    )
  );
END;
$$;

-- 7b. Operational Procedure: receive a dispatched fulfillment atomically.
CREATE OR REPLACE PROCEDURE sp_receive_blood_fulfillment(
  p_fulfillment_id UUID,
  p_user_id UUID,
  p_received_quantity INTEGER,
  p_condition_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_fulfillment RECORD;
  v_unit_count INTEGER;
  v_requested_units INTEGER;
  v_fulfilled_units INTEGER;
BEGIN
  SELECT f.id, f.request_id, f.status, br.hospital_id
  INTO v_fulfillment
  FROM fulfillments f
  JOIN blood_requests br ON br.id = f.request_id
  WHERE f.id = p_fulfillment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fulfillment not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM staff_memberships sm
    JOIN users u ON u.id = sm.user_id
    WHERE sm.user_id = p_user_id
      AND sm.hospital_id = v_fulfillment.hospital_id
      AND sm.is_active
      AND u.role = 'HOSPITAL_STAFF'
      AND u.is_active
  ) THEN
    RAISE EXCEPTION 'User is not authorized for the receiving hospital' USING ERRCODE = '42501';
  END IF;

  IF v_fulfillment.status <> 'DISPATCHED' THEN
    RAISE EXCEPTION 'Only dispatched fulfillments can be received' USING ERRCODE = '23514';
  END IF;

  SELECT count(*)::INTEGER
  INTO v_unit_count
  FROM fulfillment_units
  WHERE fulfillment_id = p_fulfillment_id;

  IF p_received_quantity IS NULL OR p_received_quantity <> v_unit_count THEN
    RAISE EXCEPTION 'Received quantity must equal the dispatched unit count' USING ERRCODE = '23514';
  END IF;

  PERFORM set_config('app.actor_id', p_user_id::text, TRUE);

  UPDATE inventory_reservations ir
  SET status = 'FULFILLED'
  FROM fulfillment_units fu
  WHERE fu.fulfillment_id = p_fulfillment_id
    AND fu.reservation_id = ir.id
    AND ir.status = 'ACTIVE';

  UPDATE blood_units bu
  SET inventory_status = 'ISSUED'
  FROM fulfillment_units fu
  WHERE fu.fulfillment_id = p_fulfillment_id
    AND fu.blood_unit_id = bu.id
    AND bu.inventory_status = 'RESERVED';

  UPDATE fulfillments
  SET status = 'RECEIVED',
      received_by = p_user_id,
      received_at = now(),
      received_quantity = p_received_quantity,
      condition_notes = NULLIF(trim(p_condition_notes), ''),
      fulfilled_at = now()
  WHERE id = p_fulfillment_id;

  SELECT COALESCE(SUM(ri.units_requested), 0)::INTEGER,
         COALESCE((
           SELECT count(*)::INTEGER
           FROM inventory_reservations ir
           JOIN request_items ri2 ON ri2.id = ir.request_item_id
           WHERE ri2.request_id = v_fulfillment.request_id
             AND ir.status = 'FULFILLED'
         ), 0)
  INTO v_requested_units, v_fulfilled_units
  FROM request_items ri
  WHERE ri.request_id = v_fulfillment.request_id;

  UPDATE blood_requests
  SET status = CASE
    WHEN v_fulfilled_units >= v_requested_units THEN 'FULFILLED'
    WHEN v_fulfilled_units > 0 THEN 'PARTIALLY_FILLED'
    ELSE status
  END
  WHERE id = v_fulfillment.request_id
    AND status <> 'CANCELLED';

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'blood_fulfillment:received',
    'fulfillments',
    p_fulfillment_id::text,
    jsonb_build_object(
      'fulfillmentId', p_fulfillment_id,
      'requestId', v_fulfillment.request_id,
      'hospitalId', v_fulfillment.hospital_id,
      'receivedQuantity', p_received_quantity,
      'receivedBy', p_user_id,
      'timestamp', now()
    )
  );
END;
$$;

-- 7c. Controlled emergency appeal state transitions.
CREATE OR REPLACE PROCEDURE sp_transition_emergency_appeal(
  p_appeal_id UUID,
  p_actor_id UUID,
  p_transition TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_appeal emergency_appeals%ROWTYPE;
  v_next_status TEXT;
BEGIN
  SELECT * INTO v_appeal
  FROM emergency_appeals
  WHERE id = p_appeal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emergency appeal not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_transition = 'APPROVE' AND v_appeal.status = 'PENDING_APPROVAL' THEN
    v_next_status := 'APPROVED';
  ELSIF p_transition = 'ACTIVATE'
        AND v_appeal.status = 'APPROVED'
        AND v_appeal.expires_at > now() THEN
    v_next_status := 'ACTIVE';
  ELSIF p_transition = 'CANCEL'
        AND v_appeal.status IN ('PENDING_APPROVAL', 'APPROVED', 'ACTIVE') THEN
    v_next_status := 'CANCELLED';
  ELSE
    RAISE EXCEPTION 'Invalid emergency appeal state transition' USING ERRCODE = '23514';
  END IF;

  UPDATE emergency_appeals
  SET status = v_next_status,
      approved_by = CASE WHEN v_next_status = 'APPROVED' THEN p_actor_id ELSE approved_by END,
      approved_at = CASE WHEN v_next_status = 'APPROVED' THEN now() ELSE approved_at END,
      updated_at = now()
  WHERE id = p_appeal_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_actor_id, 'emergency_appeals', p_appeal_id::text, p_transition);

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'emergency_appeal:' || lower(p_transition),
    'emergency_appeals',
    p_appeal_id::text,
    jsonb_build_object(
      'appealId', p_appeal_id,
      'status', v_next_status,
      'actorId', p_actor_id,
      'timestamp', now()
    )
  );
END;
$$;

-- 7. Operational View: Hospital Dashboard KPIs (Zero hardcoded fallbacks)
CREATE OR REPLACE VIEW v_hospital_dashboard_kpis AS
SELECT h.id AS hospital_id,
       h.name AS hospital_name,
       COUNT(DISTINCT br.id) FILTER (WHERE br.status IN ('OPEN', 'PARTIALLY_FILLED'))::INTEGER AS active_requests,
       COUNT(DISTINCT br.id) FILTER (WHERE br.status IN ('OPEN', 'PARTIALLY_FILLED') AND br.urgency = 'CRITICAL')::INTEGER AS critical_priority,
       COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'FULFILLED' AND br.created_at >= date_trunc('month', CURRENT_DATE))::INTEGER AS fulfilled_this_month,
       COUNT(DISTINCT ea.id) FILTER (WHERE ea.status IN ('ACTIVE', 'APPROVED'))::INTEGER AS active_appeals,
       COUNT(DISTINCT br.id)::INTEGER AS total_requests
FROM hospitals h
LEFT JOIN blood_requests br ON br.hospital_id = h.id
LEFT JOIN emergency_appeals ea ON ea.hospital_id = h.id
GROUP BY h.id, h.name;

-- 8. Operational View: Detailed Hospital Blood Requests Overview
CREATE OR REPLACE VIEW v_hospital_requests_overview AS
SELECT br.id,
       br.hospital_id,
       h.name AS hospital_name,
       loc.district_code AS hospital_district,
       br.urgency,
       br.status,
       br.needed_by,
       br.notes,
       br.created_at,
       br.created_by,
       u.full_name AS requester_name,
       COALESCE(SUM(ri.units_requested), 0)::INTEGER AS total_requested_units,
       COALESCE(
         (SELECT count(*)::int
          FROM inventory_reservations r
          JOIN request_items r_it ON r_it.id = r.request_item_id
          WHERE r_it.request_id = br.id AND r.status = 'ACTIVE'), 0
       ) AS total_reserved_units,
       COALESCE(
         (SELECT count(*)::int
          FROM inventory_reservations r
          JOIN request_items r_it ON r_it.id = r.request_item_id
          WHERE r_it.request_id = br.id AND r.status = 'FULFILLED'), 0
       ) AS total_fulfilled_units,
       COALESCE(
         (SELECT json_agg(json_build_object(
           'itemId', ri_sub.id,
           'bloodTypeCode', ri_sub.blood_type_code,
           'componentCode', ri_sub.component_code,
           'unitsRequested', ri_sub.units_requested,
           'reservedUnits', (
             SELECT count(*)::int FROM inventory_reservations res
             WHERE res.request_item_id = ri_sub.id AND res.status = 'ACTIVE'
           ),
           'fulfilledUnits', (
             SELECT count(*)::int FROM inventory_reservations res
             WHERE res.request_item_id = ri_sub.id AND res.status = 'FULFILLED'
           )
         ))
         FROM request_items ri_sub
         WHERE ri_sub.request_id = br.id), '[]'::json
       ) AS items_json
FROM blood_requests br
JOIN hospitals h ON h.id = br.hospital_id
LEFT JOIN locations loc ON loc.id = h.location_id
LEFT JOIN users u ON u.id = br.created_by
LEFT JOIN request_items ri ON ri.request_id = br.id
GROUP BY br.id, br.hospital_id, h.name, loc.district_code, br.urgency, br.status, br.needed_by, br.notes, br.created_at, br.created_by, u.full_name;

-- 10. Function: Request Matching Overview (real inventory and privacy-safe
-- potential outreach count; this does not make compatibility or clearance
-- decisions).
CREATE OR REPLACE FUNCTION fn_request_matching_summary(p_request_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_req RECORD;
  v_first_item RECORD;
  v_inventory_facilities BIGINT := 0;
  v_matching_units BIGINT := 0;
  v_potential_donors BIGINT := 0;
  v_total_requested INT := 0;
  v_total_fulfilled INT := 0;
  v_progress_pct INT := 0;
BEGIN
  -- Get request info
  SELECT br.id, br.hospital_id, br.urgency, br.status, loc.district_code
  INTO v_req
  FROM blood_requests br
  JOIN hospitals h ON h.id = br.hospital_id
  LEFT JOIN locations loc ON loc.id = h.location_id
  WHERE br.id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found');
  END IF;

  -- Get primary or first request item
  SELECT ri.id, ri.blood_type_code, ri.component_code, ri.units_requested
  INTO v_first_item
  FROM request_items ri
  WHERE ri.request_id = p_request_id
  LIMIT 1;

  IF v_first_item.id IS NOT NULL THEN
    -- Count facilities with matching available stock
    SELECT COUNT(DISTINCT bu.blood_bank_id), COUNT(bu.id)
    INTO v_inventory_facilities, v_matching_units
    FROM blood_units bu
    WHERE bu.blood_type_code = v_first_item.blood_type_code
      AND bu.component_code = v_first_item.component_code
      AND bu.release_status = 'RELEASED'
      AND bu.inventory_status = 'IN_STOCK'
      AND bu.expires_at > now();

    -- Count exact blood-group potential outreach candidates in the same
    -- district. Screening and compatibility decisions remain out of scope.
    SELECT COUNT(d.id)
    INTO v_potential_donors
    FROM donors d
    JOIN donor_consents dc ON dc.donor_id = d.id
    LEFT JOIN LATERAL (
      SELECT da.status, da.deferral_until
      FROM donor_assessments da
      WHERE da.donor_id = d.id
      ORDER BY da.assessed_at DESC
      LIMIT 1
    ) assessment ON TRUE
    WHERE d.blood_type_code = v_first_item.blood_type_code
      AND d.available_for_contact = TRUE
      AND dc.contact_allowed = TRUE
      AND dc.emergency_appeal_opt_in = TRUE
      AND d.district_code = v_req.district_code
      AND COALESCE(assessment.status, 'PASSED') <> 'PERMANENT_DEFERRAL'
      AND NOT (
        assessment.status = 'TEMPORARY_DEFERRAL'
        AND assessment.deferral_until >= CURRENT_DATE
      );
  END IF;

  -- Calculate progress percentage
  SELECT COALESCE(SUM(ri.units_requested), 0)::int,
         COALESCE((SELECT count(*)::int FROM inventory_reservations r JOIN request_items r_it ON r_it.id = r.request_item_id WHERE r_it.request_id = p_request_id AND r.status IN ('ACTIVE', 'FULFILLED')), 0)::int
  INTO v_total_requested, v_total_fulfilled
  FROM request_items ri
  WHERE ri.request_id = p_request_id;

  IF v_total_requested > 0 THEN
    v_progress_pct := LEAST(100, ROUND((v_total_fulfilled::numeric / v_total_requested::numeric) * 100));
  ELSE
    v_progress_pct := 0;
  END IF;

  RETURN jsonb_build_object(
    'requestId', p_request_id,
    'bloodTypeCode', v_first_item.blood_type_code,
    'componentCode', v_first_item.component_code,
    'unitsRequested', v_first_item.units_requested,
    'matchingProgress', v_progress_pct,
    'inventoryFacilitiesCount', v_inventory_facilities,
    'matchingStockUnits', v_matching_units,
    'potentialDonorsCount', v_potential_donors,
    'scope', 'Potential outreach only; no compatibility or medical clearance decision is made here'
  );
END;
$$;

COMMIT;

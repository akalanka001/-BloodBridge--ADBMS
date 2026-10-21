-- BloodBridge v2 Domain Extensions | PostgreSQL 16+ | migration 011
-- Aligned with Sri Lanka NBTS cluster system, inter-bank transfers, donor assessments, and transactional outbox.
-- No standalone BEGIN/COMMIT: transaction managed by scripts/migrate.js.

-- 1. GN Divisions (Gramani Niladhari) - M1 Geographical Extension
CREATE TABLE IF NOT EXISTS gn_divisions (
  code TEXT PRIMARY KEY,
  ds_code TEXT NOT NULL,
  district_code TEXT NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (ds_code, district_code) REFERENCES ds_divisions(code, district_code),
  UNIQUE(code, ds_code, district_code)
);

-- Optional gn_code on locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS gn_code TEXT;

-- 2. Blood Bank Clusters (LK-01) - M1 Organization Architecture
CREATE TABLE IF NOT EXISTS blood_bank_clusters (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cluster_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  lead_hospital_id BIGINT REFERENCES hospitals(id),
  district_code TEXT NOT NULL REFERENCES districts(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Associate blood banks with clusters
ALTER TABLE blood_banks ADD COLUMN IF NOT EXISTS cluster_id BIGINT REFERENCES blood_bank_clusters(id);

-- 3. Update blood_units inventory_status to support IN_TRANSIT (LK-02)
ALTER TABLE blood_units DROP CONSTRAINT IF EXISTS blood_units_inventory_status_check;
ALTER TABLE blood_units ADD CONSTRAINT blood_units_inventory_status_check
  CHECK (inventory_status IN ('IN_STOCK', 'RESERVED', 'IN_TRANSIT', 'ISSUED', 'DISCARDED'));

-- 4. Inter-Bank Blood Transfers (LK-02) - M4 & M3 Custody Movements
CREATE TABLE IF NOT EXISTS blood_bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code TEXT NOT NULL UNIQUE,
  source_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
  target_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'APPROVED', 'DISPATCHED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED')),
  requested_by UUID REFERENCES users(id),
  dispatched_by UUID REFERENCES users(id),
  received_by UUID REFERENCES users(id),
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_bank_id <> target_bank_id)
);

CREATE TABLE IF NOT EXISTS transfer_units (
  transfer_id UUID NOT NULL REFERENCES blood_bank_transfers(id) ON DELETE CASCADE,
  blood_unit_id UUID NOT NULL REFERENCES blood_units(id),
  PRIMARY KEY (transfer_id, blood_unit_id)
);

-- 5. Donor Consents & Clinical Assessments (LK-04) - M2 Privacy & Deferrals
CREATE TABLE IF NOT EXISTS donor_consents (
  donor_id UUID PRIMARY KEY REFERENCES donors(id) ON DELETE CASCADE,
  contact_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  camp_notification_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  emergency_appeal_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donor_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  assessed_by UUID NOT NULL REFERENCES users(id),
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hemoglobin_g_dl NUMERIC(4,1) CHECK (hemoglobin_g_dl IS NULL OR hemoglobin_g_dl BETWEEN 5.0 AND 25.0),
  weight_kg NUMERIC(4,1) CHECK (weight_kg IS NULL OR weight_kg BETWEEN 30.0 AND 250.0),
  status TEXT NOT NULL CHECK (status IN ('PASSED', 'TEMPORARY_DEFERRAL', 'PERMANENT_DEFERRAL')),
  deferral_reason TEXT,
  deferral_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status = 'PASSED' OR deferral_reason IS NOT NULL)
);

-- 6. Transactional Event Outbox (LK-12) - Reliable Async Notifications & Socket.io
CREATE TABLE IF NOT EXISTS event_outbox (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')),
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- 7. Quality Incidents & Adverse Events (LK-11) - Haemovigilance Tracking
CREATE TABLE IF NOT EXISTS quality_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code TEXT NOT NULL UNIQUE,
  blood_bank_id BIGINT REFERENCES blood_banks(id),
  blood_unit_id UUID REFERENCES blood_units(id),
  category TEXT NOT NULL CHECK (category IN ('DONOR_ADVERSE_EVENT', 'COLD_CHAIN_BREACH', 'LABELING_DISCREPANCY', 'SCREENING_RETEST', 'NEAR_MISS')),
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  corrective_action TEXT,
  reported_by UUID NOT NULL REFERENCES users(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 8. Advanced PL/pgSQL Stored Procedures for Inter-Bank Transfers

CREATE OR REPLACE PROCEDURE sp_dispatch_blood_transfer(
  p_transfer_id UUID,
  p_actor_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_bank_id BIGINT;
  v_status TEXT;
  v_unit_count INT;
BEGIN
  -- Lock transfer record
  SELECT source_bank_id, status INTO v_source_bank_id, v_status
  FROM blood_bank_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer % not found', p_transfer_id USING ERRCODE = 'P0002';
  END IF;

  IF v_status NOT IN ('REQUESTED', 'APPROVED') THEN
    RAISE EXCEPTION 'Cannot dispatch transfer in status %', v_status USING ERRCODE = '23514';
  END IF;

  -- Verify and lock all attached units
  PERFORM bu.id
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
    AND bu.blood_bank_id = v_source_bank_id
    AND bu.release_status = 'RELEASED'
    AND bu.inventory_status = 'IN_STOCK'
    AND bu.expires_at > now()
  FOR UPDATE OF bu;

  GET DIAGNOSTICS v_unit_count = ROW_COUNT;

  IF v_unit_count = 0 THEN
    RAISE EXCEPTION 'No eligible released units attached to transfer %', p_transfer_id USING ERRCODE = '23514';
  END IF;

  -- Transition units to IN_TRANSIT
  UPDATE blood_units bu
  SET inventory_status = 'IN_TRANSIT'
  FROM transfer_units tu
  WHERE tu.transfer_id = p_transfer_id
    AND bu.id = tu.blood_unit_id;

  -- Update transfer status
  UPDATE blood_bank_transfers
  SET status = 'IN_TRANSIT',
      dispatched_by = p_actor_id,
      dispatched_at = now()
  WHERE id = p_transfer_id;

  -- Record audit log
  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_actor_id, 'blood_bank_transfers', p_transfer_id::text, 'DISPATCH_TRANSFER');

  -- Record outbox event for Socket.io and notifications
  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'TRANSFER_DISPATCHED',
    'blood_bank_transfers',
    p_transfer_id::text,
    jsonb_build_object(
      'transferId', p_transfer_id,
      'status', 'IN_TRANSIT',
      'unitCount', v_unit_count,
      'dispatchedBy', p_actor_id
    )
  );
END;
$$;

CREATE OR REPLACE PROCEDURE sp_receive_blood_transfer(
  p_transfer_id UUID,
  p_actor_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_bank_id BIGINT;
  v_status TEXT;
  v_unit_count INT;
BEGIN
  -- Lock transfer record
  SELECT target_bank_id, status INTO v_target_bank_id, v_status
  FROM blood_bank_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer % not found', p_transfer_id USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'IN_TRANSIT' THEN
    RAISE EXCEPTION 'Cannot receive transfer in status % (must be IN_TRANSIT)', v_status USING ERRCODE = '23514';
  END IF;

  -- Lock attached units
  PERFORM bu.id
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
    AND bu.inventory_status = 'IN_TRANSIT'
  FOR UPDATE OF bu;

  GET DIAGNOSTICS v_unit_count = ROW_COUNT;


  -- Reassign custody to destination bank and return to IN_STOCK
  UPDATE blood_units bu
  SET blood_bank_id = v_target_bank_id,
      inventory_status = 'IN_STOCK'
  FROM transfer_units tu
  WHERE tu.transfer_id = p_transfer_id
    AND bu.id = tu.blood_unit_id;

  -- Update transfer status
  UPDATE blood_bank_transfers
  SET status = 'RECEIVED',
      received_by = p_actor_id,
      received_at = now()
  WHERE id = p_transfer_id;

  -- Record audit log
  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_actor_id, 'blood_bank_transfers', p_transfer_id::text, 'RECEIVE_TRANSFER');

  -- Record outbox event
  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'TRANSFER_RECEIVED',
    'blood_bank_transfers',
    p_transfer_id::text,
    jsonb_build_object(
      'transferId', p_transfer_id,
      'status', 'RECEIVED',
      'targetBankId', v_target_bank_id,
      'unitCount', v_unit_count,
      'receivedBy', p_actor_id
    )
  );
END;
$$;

-- 9. Potential Donor Matching Function (LK-04, LK-12) - M2 Module
CREATE OR REPLACE FUNCTION fn_match_potential_donors(
  p_blood_type_code TEXT,
  p_district_code TEXT,
  p_ds_code TEXT DEFAULT NULL,
  p_min_interval_days INT DEFAULT 120
)
RETURNS TABLE (
  donor_id UUID,
  district_code TEXT,
  ds_code TEXT,
  blood_type_code TEXT,
  last_donation_at TIMESTAMPTZ,
  days_since_last_donation INT
)
LANGUAGE sql
STABLE
AS $$
  SELECT d.id AS donor_id,
         d.district_code,
         d.ds_code,
         d.blood_type_code,
         recent.last_donation,
         COALESCE(EXTRACT(DAY FROM (now() - recent.last_donation))::int, 9999) AS days_since_last_donation
  FROM donors d
  JOIN users u ON u.id = d.user_id AND u.is_active = TRUE
  LEFT JOIN LATERAL (
    SELECT max(don.collected_at) AS last_donation
    FROM donations don
    WHERE don.donor_id = d.id
  ) recent ON true
  WHERE d.available_for_contact = TRUE
    AND (p_blood_type_code IS NULL OR d.blood_type_code = p_blood_type_code)
    AND (p_district_code IS NULL OR d.district_code = p_district_code)
    AND (p_ds_code IS NULL OR d.ds_code = p_ds_code)
    AND (recent.last_donation IS NULL OR recent.last_donation <= now() - (p_min_interval_days || ' days')::interval)
    -- Exclude currently deferred donors
    AND NOT EXISTS (
      SELECT 1 FROM donor_assessments da
      WHERE da.donor_id = d.id
        AND da.status IN ('PERMANENT_DEFERRAL', 'TEMPORARY_DEFERRAL')
        AND (da.deferral_until IS NULL OR da.deferral_until >= CURRENT_DATE)
    );
$$;

-- 10. Operational Views for Clusters and Inter-Bank Monitoring
CREATE OR REPLACE VIEW v_blood_bank_cluster_stock AS
SELECT c.id AS cluster_id,
       c.cluster_code,
       c.name AS cluster_name,
       bu.blood_type_code,
       bu.component_code,
       count(bu.id)::bigint AS available_units,
       min(bu.expires_at) AS earliest_expiry
FROM blood_bank_clusters c
JOIN blood_banks bb ON bb.cluster_id = c.id
JOIN blood_units bu ON bu.blood_bank_id = bb.id
WHERE bu.release_status = 'RELEASED'
  AND bu.inventory_status = 'IN_STOCK'
  AND bu.expires_at > now()
GROUP BY c.id, c.cluster_code, c.name, bu.blood_type_code, bu.component_code;

CREATE OR REPLACE VIEW v_transfers_in_transit AS
SELECT t.id AS transfer_id,
       t.transfer_code,
       sb.name AS source_bank_name,
       tb.name AS target_bank_name,
       t.status,
       t.dispatched_at,
       count(tu.blood_unit_id)::bigint AS units_count
FROM blood_bank_transfers t
JOIN blood_banks sb ON sb.id = t.source_bank_id
JOIN blood_banks tb ON tb.id = t.target_bank_id
LEFT JOIN transfer_units tu ON tu.transfer_id = t.id
WHERE t.status = 'IN_TRANSIT'
GROUP BY t.id, t.transfer_code, sb.name, tb.name, t.status, t.dispatched_at;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfers_status ON blood_bank_transfers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donor_assessments_lookup ON donor_assessments(donor_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON event_outbox(created_at) WHERE status = 'PENDING';

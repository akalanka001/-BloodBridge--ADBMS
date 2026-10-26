-- BloodBridge Hybrid Donor Registration & Provenance | PostgreSQL 16+ | migration 012
-- Aligned with Sri Lanka NBTS dual enrollment (Online self-registration vs Staff-assisted walk-in intake)
-- No standalone BEGIN/COMMIT: transaction managed atomically by scripts/migrate.js.

-- 1. Modify donors table to allow staff-enrolled donors without an online user account
ALTER TABLE donors ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add provenance and offline donor identity fields
ALTER TABLE donors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS registration_origin TEXT NOT NULL DEFAULT 'ONLINE'
  CHECK (registration_origin IN ('ONLINE', 'STAFF_WALKIN', 'CAMP_WALKIN'));
ALTER TABLE donors ADD COLUMN IF NOT EXISTS national_id_hash TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS enrolled_by UUID REFERENCES users(id);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS enrolled_at_bank_id BIGINT REFERENCES blood_banks(id);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS enrolled_at_camp_id UUID REFERENCES donation_camps(id);

-- Enforce unique national ID hash when provided (prevents duplicate donor records)
CREATE UNIQUE INDEX IF NOT EXISTS uq_donors_national_id_hash
  ON donors(national_id_hash) WHERE national_id_hash IS NOT NULL;

-- 3. In-Person Donor Visits and Check-ins (Visit != Donation)
CREATE TABLE IF NOT EXISTS donor_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  blood_bank_id BIGINT REFERENCES blood_banks(id),
  camp_id UUID REFERENCES donation_camps(id),
  checked_in_by UUID NOT NULL REFERENCES users(id),
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  purpose TEXT NOT NULL DEFAULT 'DONATION'
    CHECK (purpose IN ('DONATION', 'CONSULTATION', 'RETEST')),
  status TEXT NOT NULL DEFAULT 'CHECKED_IN'
    CHECK (status IN ('CHECKED_IN', 'ASSESSMENT_PENDING', 'DEFERRED', 'COLLECTION_COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (blood_bank_id IS NOT NULL OR camp_id IS NOT NULL)
);

-- Link clinical assessment to the specific visit if applicable
ALTER TABLE donor_assessments ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES donor_visits(id);

-- 4. Online Account Link Claims (Walk-in donor later claims identity online)
CREATE TABLE IF NOT EXISTS donor_account_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  donor_id UUID NOT NULL REFERENCES donors(id),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  verification_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, donor_id)
);

-- Partial index: only one active pending claim per donor or user
CREATE UNIQUE INDEX IF NOT EXISTS uq_donor_active_claim
  ON donor_account_claims(donor_id) WHERE status = 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_active_claim
  ON donor_account_claims(user_id) WHERE status = 'PENDING';

-- 5. Auditable Consent Change History
CREATE TABLE IF NOT EXISTS donor_consent_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  contact_allowed BOOLEAN NOT NULL,
  camp_notification_opt_in BOOLEAN NOT NULL,
  emergency_appeal_opt_in BOOLEAN NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Trigger to log consent updates automatically
CREATE OR REPLACE FUNCTION fn_audit_donor_consent_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO donor_consent_history (
    donor_id,
    contact_allowed,
    camp_notification_opt_in,
    emergency_appeal_opt_in,
    recorded_at
  ) VALUES (
    NEW.donor_id,
    NEW.contact_allowed,
    NEW.camp_notification_opt_in,
    NEW.emergency_appeal_opt_in,
    now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_donor_consent_change ON donor_consents;
CREATE TRIGGER trg_log_donor_consent_change
AFTER INSERT OR UPDATE ON donor_consents
FOR EACH ROW EXECUTE FUNCTION fn_audit_donor_consent_change();

-- 7. Stored Procedure: sp_approve_donor_account_claim
CREATE OR REPLACE PROCEDURE sp_approve_donor_account_claim(
  p_claim_id UUID,
  p_reviewer_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_donor_id UUID;
  v_claim_status TEXT;
  v_existing_donor_user_id UUID;
  v_user_already_linked UUID;
BEGIN
  -- Lock claim record
  SELECT user_id, donor_id, status INTO v_user_id, v_donor_id, v_claim_status
  FROM donor_account_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim % not found', p_claim_id USING ERRCODE = 'P0002';
  END IF;

  IF v_claim_status <> 'PENDING' THEN
    RAISE EXCEPTION 'Cannot approve claim in status % (must be PENDING)', v_claim_status USING ERRCODE = '23514';
  END IF;

  -- Lock donor record and check if already linked
  SELECT user_id INTO v_existing_donor_user_id
  FROM donors
  WHERE id = v_donor_id
  FOR UPDATE;

  IF v_existing_donor_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Donor % is already linked to user %', v_donor_id, v_existing_donor_user_id USING ERRCODE = '23505';
  END IF;

  -- Check if user already owns another donor record
  SELECT id INTO v_user_already_linked
  FROM donors
  WHERE user_id = v_user_id;

  IF v_user_already_linked IS NOT NULL THEN
    RAISE EXCEPTION 'User % is already linked to donor %', v_user_id, v_user_already_linked USING ERRCODE = '23505';
  END IF;

  -- Link user to donor
  UPDATE donors
  SET user_id = v_user_id
  WHERE id = v_donor_id;

  -- Update claim status
  UPDATE donor_account_claims
  SET status = 'APPROVED',
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE id = p_claim_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_reviewer_id, 'donor_account_claims', p_claim_id::text, 'APPROVE_CLAIM');

  -- Outbox event
  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'DONOR_ACCOUNT_LINKED',
    'donors',
    v_donor_id::text,
    jsonb_build_object(
      'claimId', p_claim_id,
      'donorId', v_donor_id,
      'userId', v_user_id,
      'approvedBy', p_reviewer_id
    )
  );
END;
$$;

-- 8. Stored Procedure: sp_reject_donor_account_claim
CREATE OR REPLACE PROCEDURE sp_reject_donor_account_claim(
  p_claim_id UUID,
  p_reviewer_id UUID,
  p_rejection_reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_claim_status TEXT;
BEGIN
  SELECT status INTO v_claim_status
  FROM donor_account_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim % not found', p_claim_id USING ERRCODE = 'P0002';
  END IF;

  IF v_claim_status <> 'PENDING' THEN
    RAISE EXCEPTION 'Cannot reject claim in status % (must be PENDING)', v_claim_status USING ERRCODE = '23514';
  END IF;

  UPDATE donor_account_claims
  SET status = 'REJECTED',
      reviewed_by = p_reviewer_id,
      reviewed_at = now(),
      verification_notes = COALESCE(verification_notes || ' | Rejection: ', '') || p_rejection_reason
  WHERE id = p_claim_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_reviewer_id, 'donor_account_claims', p_claim_id::text, 'REJECT_CLAIM');
END;
$$;

-- 9. Update fn_match_potential_donors to handle walk-in donors without users
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
  LEFT JOIN users u ON u.id = d.user_id
  LEFT JOIN LATERAL (
    SELECT max(don.collected_at) AS last_donation
    FROM donations don
    WHERE don.donor_id = d.id
  ) recent ON true
  WHERE d.available_for_contact = TRUE
    AND (u.id IS NULL OR u.is_active = TRUE)
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

-- 10. Operational View for Staff Donor Lookup
CREATE OR REPLACE VIEW v_donor_intake_lookup AS
SELECT d.id AS donor_id,
       COALESCE(d.full_name, u.full_name) AS full_name,
       COALESCE(d.phone, u.phone) AS phone,
       COALESCE(d.email, u.email) AS email,
       d.blood_type_code,
       d.district_code,
       d.ds_code,
       d.registration_origin,
       d.available_for_contact,
       d.camp_notifications_opt_in,
       d.user_id,
       (d.user_id IS NOT NULL) AS is_online_account,
       recent.last_donation_date,
       assess.latest_assessment_status,
       assess.deferral_until
FROM donors d
LEFT JOIN users u ON u.id = d.user_id
LEFT JOIN LATERAL (
  SELECT max(don.collected_at) AS last_donation_date
  FROM donations don
  WHERE don.donor_id = d.id
) recent ON true
LEFT JOIN LATERAL (
  SELECT da.status AS latest_assessment_status, da.deferral_until
  FROM donor_assessments da
  WHERE da.donor_id = d.id
  ORDER BY da.assessed_at DESC
  LIMIT 1
) assess ON true;

CREATE INDEX IF NOT EXISTS idx_donor_visits_donor ON donor_visits(donor_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_donor_claims_status ON donor_account_claims(status, claimed_at DESC);

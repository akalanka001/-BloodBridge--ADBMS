-- BloodBridge v2 Corrective Domain & Authorization Migration | PostgreSQL 16+ | migration 013
-- Aligned with Sri Lanka NBTS cluster transfers, donor provenance reconciliation, and atomic intake collection.
-- No standalone BEGIN/COMMIT: transaction managed atomically by scripts/migrate.js.

-- 1. Schema Extensions
-- Link donations uniquely to donor_visits to strictly enforce 1 donation per completed visit at DB level
ALTER TABLE donations ADD COLUMN IF NOT EXISTS visit_id UUID UNIQUE REFERENCES donor_visits(id);

-- Track reconciled placeholder donor profiles
ALTER TABLE donors ADD COLUMN IF NOT EXISTS reconciled_to_donor_id UUID REFERENCES donors(id);

-- 2. Trigger: Prevent silent reassignment of donor visits across institutions or donors
CREATE OR REPLACE FUNCTION fn_prevent_visit_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.blood_bank_id IS DISTINCT FROM OLD.blood_bank_id THEN
    RAISE EXCEPTION 'Cannot reassign donor visit % to a different blood bank', OLD.id USING ERRCODE = '23514';
  END IF;
  IF NEW.donor_id IS DISTINCT FROM OLD.donor_id THEN
    RAISE EXCEPTION 'Cannot reassign donor visit % to a different donor', OLD.id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_visit_reassignment ON donor_visits;
CREATE TRIGGER trg_prevent_visit_reassignment
BEFORE UPDATE OF blood_bank_id, donor_id ON donor_visits
FOR EACH ROW EXECUTE FUNCTION fn_prevent_visit_reassignment();

-- 3. Stored Procedure: Safe Donor Account Claim Approval with Identity Reconciliation
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

  -- Lock walk-in donor record and check if already linked to someone else
  SELECT user_id INTO v_existing_donor_user_id
  FROM donors
  WHERE id = v_donor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target donor % not found', v_donor_id USING ERRCODE = 'P0002';
  END IF;

  IF v_existing_donor_user_id IS NOT NULL AND v_existing_donor_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Donor % is already linked to user %', v_donor_id, v_existing_donor_user_id USING ERRCODE = '23505';
  END IF;

  -- Check if user already owns another donor record (e.g. created during online self-registration)
  SELECT id INTO v_user_already_linked
  FROM donors
  WHERE user_id = v_user_id AND id <> v_donor_id;

  IF v_user_already_linked IS NOT NULL THEN
    -- Verify whether existing profile has conflicting clinical history
    IF EXISTS (SELECT 1 FROM donations WHERE donor_id = v_user_already_linked)
       OR EXISTS (SELECT 1 FROM donor_assessments WHERE donor_id = v_user_already_linked)
       OR EXISTS (SELECT 1 FROM donor_visits WHERE donor_id = v_user_already_linked) THEN
      RAISE EXCEPTION 'User % already has an active donor profile % with clinical history. Cannot merge identities automatically.',
        v_user_id, v_user_already_linked USING ERRCODE = '23514';
    END IF;

    -- Safely migrate any non-clinical registrations from placeholder profile to walk-in profile
    UPDATE camp_registrations cr
    SET donor_id = v_donor_id
    WHERE cr.donor_id = v_user_already_linked
      AND NOT EXISTS (
        SELECT 1 FROM camp_registrations cr2
        WHERE cr2.donor_id = v_donor_id AND cr2.camp_id = cr.camp_id
      );
    DELETE FROM camp_registrations WHERE donor_id = v_user_already_linked;

    -- Reconcile consent preferences to walk-in donor profile
    UPDATE donor_consents dc_target
    SET contact_allowed = dc_source.contact_allowed,
        camp_notification_opt_in = dc_source.camp_notification_opt_in,
        emergency_appeal_opt_in = dc_source.emergency_appeal_opt_in,
        updated_at = now()
    FROM donor_consents dc_source
    WHERE dc_source.donor_id = v_user_already_linked AND dc_target.donor_id = v_donor_id;

    -- Unlink placeholder profile and flag reconciliation
    UPDATE donors
    SET user_id = NULL,
        reconciled_to_donor_id = v_donor_id
    WHERE id = v_user_already_linked;
  END IF;

  -- Link online user to historical walk-in donor profile
  UPDATE donors
  SET user_id = v_user_id
  WHERE id = v_donor_id;

  -- Update claim status
  UPDATE donor_account_claims
  SET status = 'APPROVED',
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE id = p_claim_id;

  -- Record audit log
  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_reviewer_id, 'donor_account_claims', p_claim_id::text, 'APPROVE_CLAIM');

  -- Record outbox event
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

-- 4. Stored Procedure: Atomic Transfer Dispatch with Strict Unit Verification & Institution Authorization
CREATE OR REPLACE PROCEDURE sp_dispatch_blood_transfer(
  p_transfer_id UUID,
  p_actor_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_bank_id BIGINT;
  v_status TEXT;
  v_total_units INT;
  v_bad_unit_id UUID;
  v_bad_bank_id BIGINT;
  v_bad_release_status TEXT;
  v_bad_inv_status TEXT;
  v_bad_expiry TIMESTAMPTZ;
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
    RAISE EXCEPTION 'Cannot dispatch transfer in status % (must be REQUESTED or APPROVED)', v_status USING ERRCODE = '23514';
  END IF;

  -- Verify actor authorization: must be ADMIN or assigned staff at source bank
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_actor_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_actor_id AND blood_bank_id = v_source_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Actor % is not authorized to dispatch transfers for source blood bank %', p_actor_id, v_source_bank_id USING ERRCODE = '42501';
  END IF;

  -- Verify attached units exist
  SELECT count(*) INTO v_total_units
  FROM transfer_units
  WHERE transfer_id = p_transfer_id;

  IF v_total_units = 0 THEN
    RAISE EXCEPTION 'No units attached to transfer %', p_transfer_id USING ERRCODE = '23514';
  END IF;

  -- Verify that EVERY attached unit is eligible (not expired, released, in stock, at source bank)
  SELECT bu.id, bu.blood_bank_id, bu.release_status, bu.inventory_status, bu.expires_at
  INTO v_bad_unit_id, v_bad_bank_id, v_bad_release_status, v_bad_inv_status, v_bad_expiry
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
    AND (
      bu.blood_bank_id <> v_source_bank_id
      OR bu.release_status <> 'RELEASED'
      OR bu.inventory_status <> 'IN_STOCK'
      OR bu.expires_at <= now()
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Unit % attached to transfer % is ineligible for dispatch (bank: %, release: %, status: %, expiry: %)',
      v_bad_unit_id, p_transfer_id, v_bad_bank_id, v_bad_release_status, v_bad_inv_status, v_bad_expiry
      USING ERRCODE = '23514';
  END IF;

  -- Lock all attached units
  PERFORM bu.id
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
  FOR UPDATE OF bu;

  -- Set session actor for inventory movement trigger
  PERFORM set_config('app.actor_id', p_actor_id::text, TRUE);

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

  -- Record outbox event
  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'TRANSFER_DISPATCHED',
    'blood_bank_transfers',
    p_transfer_id::text,
    jsonb_build_object(
      'transferId', p_transfer_id,
      'status', 'IN_TRANSIT',
      'sourceBankId', v_source_bank_id,
      'unitCount', v_total_units,
      'dispatchedBy', p_actor_id
    )
  );
END;
$$;

-- 5. Stored Procedure: Reconciled Transfer Receipt with Notes & Destination Authorization
-- Drop legacy 2-parameter signature if present to avoid overload ambiguity
DROP PROCEDURE IF EXISTS sp_receive_blood_transfer(UUID, UUID);

CREATE OR REPLACE PROCEDURE sp_receive_blood_transfer(
  p_transfer_id UUID,
  p_actor_id UUID,
  p_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_bank_id BIGINT;
  v_target_bank_id BIGINT;
  v_status TEXT;
  v_unit_count INT;
BEGIN
  -- Lock transfer record
  SELECT source_bank_id, target_bank_id, status INTO v_source_bank_id, v_target_bank_id, v_status
  FROM blood_bank_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer % not found', p_transfer_id USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'IN_TRANSIT' THEN
    RAISE EXCEPTION 'Cannot receive transfer in status % (must be IN_TRANSIT)', v_status USING ERRCODE = '23514';
  END IF;

  -- Verify actor authorization: must be ADMIN or assigned staff at target destination bank
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_actor_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_actor_id AND blood_bank_id = v_target_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Actor % is not authorized to receive transfers for destination blood bank %', p_actor_id, v_target_bank_id USING ERRCODE = '42501';
  END IF;

  -- Lock attached units
  PERFORM bu.id
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
    AND bu.inventory_status = 'IN_TRANSIT'
  FOR UPDATE OF bu;

  GET DIAGNOSTICS v_unit_count = ROW_COUNT;

  -- Set session actor for inventory movement trigger
  PERFORM set_config('app.actor_id', p_actor_id::text, TRUE);

  -- Reassign custody to destination bank and return to IN_STOCK
  UPDATE blood_units bu
  SET blood_bank_id = v_target_bank_id,
      inventory_status = 'IN_STOCK'
  FROM transfer_units tu
  WHERE tu.transfer_id = p_transfer_id
    AND bu.id = tu.blood_unit_id;

  -- Update transfer status and append receipt notes if provided
  UPDATE blood_bank_transfers
  SET status = 'RECEIVED',
      received_by = p_actor_id,
      received_at = now(),
      notes = CASE
        WHEN p_notes IS NOT NULL AND p_notes <> ''
        THEN COALESCE(notes || ' | Receipt: ', '') || p_notes
        ELSE notes
      END
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
      'sourceBankId', v_source_bank_id,
      'targetBankId', v_target_bank_id,
      'unitCount', v_unit_count,
      'receivedBy', p_actor_id,
      'notes', p_notes
    )
  );
END;
$$;

-- 6. Stored Procedure: Atomic & Concurrency-Safe Donation Collection Recording
CREATE OR REPLACE PROCEDURE sp_record_donation_collection(
  p_visit_id UUID,
  p_donor_id UUID,
  p_blood_bank_id BIGINT,
  p_camp_id UUID,
  p_blood_type_code TEXT,
  p_collected_volume_ml INT,
  p_collector_id UUID,
  INOUT p_donation_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_visit_donor_id UUID;
  v_visit_bank_id BIGINT;
  v_visit_camp_id UUID;
  v_visit_status TEXT;
  v_latest_assess_status TEXT;
BEGIN
  -- Lock visit record FOR UPDATE to serialize concurrent collection attempts
  SELECT donor_id, blood_bank_id, camp_id, status
  INTO v_visit_donor_id, v_visit_bank_id, v_visit_camp_id, v_visit_status
  FROM donor_visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % not found', p_visit_id USING ERRCODE = 'P0002';
  END IF;

  IF v_visit_status = 'COLLECTION_COMPLETED' THEN
    RAISE EXCEPTION 'Visit % has already completed donation collection', p_visit_id USING ERRCODE = '23514';
  END IF;

  IF v_visit_status IN ('DEFERRED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Cannot record collection for visit % in status %', p_visit_id, v_visit_status USING ERRCODE = '23514';
  END IF;

  IF v_visit_donor_id <> p_donor_id THEN
    RAISE EXCEPTION 'Donor % does not match visit donor %', p_donor_id, v_visit_donor_id USING ERRCODE = '23514';
  END IF;

  IF v_visit_bank_id IS NOT NULL AND v_visit_bank_id <> p_blood_bank_id THEN
    RAISE EXCEPTION 'Blood bank % does not match visit bank %', p_blood_bank_id, v_visit_bank_id USING ERRCODE = '23514';
  END IF;

  -- Verify actor authorization: must be ADMIN or assigned staff at collection bank
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_collector_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_collector_id AND blood_bank_id = p_blood_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Actor % is not authorized to record collections at blood bank %', p_collector_id, p_blood_bank_id USING ERRCODE = '42501';
  END IF;

  -- Ensure visit has a locked PASSED assessment
  SELECT status INTO v_latest_assess_status
  FROM donor_assessments
  WHERE visit_id = p_visit_id AND donor_id = p_donor_id
  ORDER BY assessed_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_latest_assess_status IS NULL OR v_latest_assess_status <> 'PASSED' THEN
    RAISE EXCEPTION 'Cannot record collection: Visit % does not have a passing assessment (status: %)',
      p_visit_id, COALESCE(v_latest_assess_status, 'NONE') USING ERRCODE = '23514';
  END IF;

  -- Insert donation with visit_id constraint
  p_donation_id := gen_random_uuid();
  INSERT INTO donations (
    id, visit_id, donor_id, blood_bank_id, camp_id,
    collected_at, collected_volume_ml, process_status
  )
  VALUES (
    p_donation_id, p_visit_id, p_donor_id, p_blood_bank_id, p_camp_id,
    now(), p_collected_volume_ml, 'COLLECTED'
  );

  -- Transition visit status to COLLECTION_COMPLETED
  UPDATE donor_visits
  SET status = 'COLLECTION_COMPLETED'
  WHERE id = p_visit_id;

  -- If donor blood type was unconfirmed, update it
  IF p_blood_type_code IS NOT NULL THEN
    UPDATE donors
    SET blood_type_code = p_blood_type_code
    WHERE id = p_donor_id AND blood_type_code IS NULL;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_collector_id, 'donations', p_donation_id::text, 'COLLECT_DONATION');

  -- Outbox event
  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'DONATION_COLLECTED',
    'donations',
    p_donation_id::text,
    jsonb_build_object(
      'donationId', p_donation_id,
      'visitId', p_visit_id,
      'donorId', p_donor_id,
      'bloodBankId', p_blood_bank_id,
      'campId', p_camp_id,
      'bloodTypeCode', p_blood_type_code,
      'collectedVolumeMl', p_collected_volume_ml
    )
  );
END;
$$;

-- 7. Stored Procedure: Atomic Clinical Assessment Recording with Institution Authorization
CREATE OR REPLACE PROCEDURE sp_record_donor_assessment(
  p_visit_id UUID,
  p_assessed_by UUID,
  p_hemoglobin NUMERIC,
  p_weight NUMERIC,
  p_status TEXT,
  p_deferral_reason TEXT,
  p_deferral_until DATE,
  p_notes TEXT,
  INOUT p_assessment_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_donor_id UUID;
  v_bank_id BIGINT;
  v_visit_status TEXT;
  v_new_visit_status TEXT;
BEGIN
  -- Lock visit record
  SELECT donor_id, blood_bank_id, status
  INTO v_donor_id, v_bank_id, v_visit_status
  FROM donor_visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % not found', p_visit_id USING ERRCODE = 'P0002';
  END IF;

  IF v_visit_status = 'COLLECTION_COMPLETED' THEN
    RAISE EXCEPTION 'Cannot record assessment on visit % that has already completed collection', p_visit_id USING ERRCODE = '23514';
  END IF;

  -- Verify actor authorization: must be ADMIN or assigned staff at visit's blood bank
  IF v_bank_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM users WHERE id = p_assessed_by AND role = 'ADMIN'
    ) AND NOT EXISTS (
      SELECT 1 FROM staff_memberships
      WHERE user_id = p_assessed_by AND blood_bank_id = v_bank_id AND is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Actor % is not authorized to assess donors for blood bank %', p_assessed_by, v_bank_id USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Enforce deferral reason if status is not PASSED
  IF p_status IN ('TEMPORARY_DEFERRAL', 'PERMANENT_DEFERRAL') AND (p_deferral_reason IS NULL OR trim(p_deferral_reason) = '') THEN
    RAISE EXCEPTION 'deferral_reason is mandatory when assessment status is %', p_status USING ERRCODE = '23514';
  END IF;

  p_assessment_id := gen_random_uuid();
  INSERT INTO donor_assessments (
    id, visit_id, donor_id, assessed_by, assessed_at,
    hemoglobin_g_dl, weight_kg, status, deferral_reason, deferral_until, notes
  )
  VALUES (
    p_assessment_id, p_visit_id, v_donor_id, p_assessed_by, now(),
    p_hemoglobin, p_weight, p_status, p_deferral_reason, p_deferral_until, p_notes
  );

  v_new_visit_status := CASE WHEN p_status = 'PASSED' THEN 'ASSESSMENT_PENDING' ELSE 'DEFERRED' END;
  UPDATE donor_visits
  SET status = v_new_visit_status
  WHERE id = p_visit_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_assessed_by, 'donor_assessments', p_assessment_id::text, 'RECORD_ASSESSMENT');
END;
$$;

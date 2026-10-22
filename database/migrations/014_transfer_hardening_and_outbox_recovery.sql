-- ============================================================================
-- Migration 014: Transfer Concurrency Hardening, Receipt Pre-Condition
--                Enforcement, and Outbox Stale-Event Recovery
-- ============================================================================

-- 1. Schema Extensions for Outbox Lifecycle Tracking
ALTER TABLE event_outbox
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_outbox_processing_stale
  ON event_outbox(updated_at)
  WHERE status = 'PROCESSING';

-- 2. Hardened Transfer Dispatch Procedure
-- Locks blood units BEFORE running eligibility assertions to prevent race conditions.
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
  -- 1. Lock the transfer record
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

  -- 2. Verify actor is ADMIN or active staff at source blood bank
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_actor_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_actor_id AND blood_bank_id = v_source_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Actor % is not authorized to dispatch transfers for source blood bank %',
      p_actor_id, v_source_bank_id USING ERRCODE = '42501';
  END IF;

  -- 3. Verify that units are attached
  SELECT count(*) INTO v_total_units
  FROM transfer_units
  WHERE transfer_id = p_transfer_id;

  IF v_total_units = 0 THEN
    RAISE EXCEPTION 'Cannot dispatch transfer % with zero attached units', p_transfer_id USING ERRCODE = '23514';
  END IF;

  -- 4. HARDENING: Lock ALL attached blood units FIRST before evaluating eligibility
  PERFORM bu.id
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
  FOR UPDATE OF bu;

  -- 5. NOW validate every attached unit under the active row-level locks
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

  -- 6. Set session actor for inventory movement trigger
  PERFORM set_config('app.actor_id', p_actor_id::text, TRUE);

  -- 7. Transition all attached units to IN_TRANSIT
  UPDATE blood_units bu
  SET inventory_status = 'IN_TRANSIT'
  FROM transfer_units tu
  WHERE tu.transfer_id = p_transfer_id
    AND bu.id = tu.blood_unit_id;

  -- 8. Update transfer status
  UPDATE blood_bank_transfers
  SET status = 'IN_TRANSIT',
      dispatched_by = p_actor_id,
      dispatched_at = now()
  WHERE id = p_transfer_id;

  -- 9. Record audit log
  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_actor_id, 'blood_bank_transfers', p_transfer_id::text, 'DISPATCH_TRANSFER');

  -- 10. Record outbox event
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

-- 3. Hardened Transfer Receipt Procedure
-- Locks attached units first and strictly asserts EVERY unit is IN_TRANSIT before custody change.
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
  v_total_units INT;
  v_bad_unit_id UUID;
  v_bad_inv_status TEXT;
  v_bad_bank_id BIGINT;
BEGIN
  -- 1. Lock transfer record
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

  -- 2. Verify actor authorization: must be ADMIN or assigned staff at destination bank
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_actor_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_actor_id AND blood_bank_id = v_target_bank_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Actor % is not authorized to receive transfers for destination blood bank %', p_actor_id, v_target_bank_id USING ERRCODE = '42501';
  END IF;

  -- 3. Verify transfer has attached units
  SELECT count(*) INTO v_total_units
  FROM transfer_units
  WHERE transfer_id = p_transfer_id;

  IF v_total_units = 0 THEN
    RAISE EXCEPTION 'Cannot receive transfer % with zero attached units', p_transfer_id USING ERRCODE = '23514';
  END IF;

  -- 4. HARDENING: Lock ALL attached units for update
  PERFORM bu.id
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
  FOR UPDATE OF bu;

  -- 5. HARDENING: Assert that EVERY attached unit is currently IN_TRANSIT and at source bank
  SELECT bu.id, bu.inventory_status, bu.blood_bank_id
  INTO v_bad_unit_id, v_bad_inv_status, v_bad_bank_id
  FROM transfer_units tu
  JOIN blood_units bu ON bu.id = tu.blood_unit_id
  WHERE tu.transfer_id = p_transfer_id
    AND (bu.inventory_status <> 'IN_TRANSIT' OR bu.blood_bank_id <> v_source_bank_id)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Attached unit % is not in transit for transfer % (current status: %, bank: %, expected bank: %)',
      v_bad_unit_id, p_transfer_id, v_bad_inv_status, v_bad_bank_id, v_source_bank_id
      USING ERRCODE = '23514';
  END IF;

  -- 6. Set session actor for inventory movement trigger
  PERFORM set_config('app.actor_id', p_actor_id::text, TRUE);

  -- 7. Reassign custody to destination bank and return to IN_STOCK atomically
  UPDATE blood_units bu
  SET blood_bank_id = v_target_bank_id,
      inventory_status = 'IN_STOCK'
  FROM transfer_units tu
  WHERE tu.transfer_id = p_transfer_id
    AND bu.id = tu.blood_unit_id;

  -- 8. Mark transfer RECEIVED with notes
  UPDATE blood_bank_transfers
  SET status = 'RECEIVED',
      received_by = p_actor_id,
      received_at = now(),
      notes = CASE
        WHEN p_notes IS NOT NULL AND notes IS NOT NULL THEN notes || E'\n[Receipt Notes]: ' || p_notes
        WHEN p_notes IS NOT NULL THEN p_notes
        ELSE notes
      END
  WHERE id = p_transfer_id;

  -- 9. Audit log
  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_actor_id, 'blood_bank_transfers', p_transfer_id::text, 'RECEIVE_TRANSFER');

  -- 10. Outbox event
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
      'unitCount', v_total_units,
      'receivedBy', p_actor_id,
      'receiptNotes', p_notes
    )
  );
END;
$$;

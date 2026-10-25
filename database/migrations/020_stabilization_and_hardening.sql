-- BloodBridge Migration 020: Version 1 Stabilization, Security Hardening & Integration Integrity
-- Preserves migrations 001-019. Forward-only corrective changes.

BEGIN;

-- 1. Correct demo invitation pollution and consent defaults from migration 016
DELETE FROM donor_invitations
WHERE id IN (
  'e1111111-1111-1111-1111-111111111111',
  'e2222222-2222-2222-2222-222222222222'
);

-- Ensure explicit opt-in defaults in donor_consents (no forced consent on schema creation)
ALTER TABLE donor_consents ALTER COLUMN sms_alerts SET DEFAULT FALSE;
ALTER TABLE donor_consents ALTER COLUMN email_alerts SET DEFAULT FALSE;
ALTER TABLE donor_consents ALTER COLUMN emergency_appeal_opt_in SET DEFAULT FALSE;

-- 2. Update sp_release_blood_unit to enforce clinical release authority:
--    Staff MUST have active membership at the unit's blood bank.
--    Admins do not silently bypass clinical release authorization.
CREATE OR REPLACE PROCEDURE sp_release_blood_unit(
  p_unit_id UUID,
  p_staff_user_id UUID,
  p_release_status TEXT,
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

  -- Clinical release strictly requires active bank staff membership at the unit's blood bank
  IF NOT EXISTS (
    SELECT 1 FROM staff_memberships
    WHERE user_id = p_staff_user_id
      AND blood_bank_id = v_unit.blood_bank_id
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Staff % is not authorized for clinical release at blood bank %', p_staff_user_id, v_unit.blood_bank_id USING ERRCODE = '42501';
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
  VALUES (p_unit_id, 'QUARANTINED', p_release_status, 'CLINICAL_RELEASE', p_staff_user_id);
END;
$$;

-- 3. Enforce single active booking per donor per date/session
CREATE UNIQUE INDEX IF NOT EXISTS uq_donor_active_appointment_date
  ON donor_appointments (donor_id, appointment_date, COALESCE(blood_bank_id, 0), COALESCE(camp_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status IN ('BOOKED', 'CONFIRMED');

-- 4. Fast capacity lookup index for donor appointments
CREATE INDEX IF NOT EXISTS idx_donor_appointments_slot_capacity
  ON donor_appointments (appointment_date, time_slot, blood_bank_id, camp_id)
  WHERE status IN ('BOOKED', 'CONFIRMED');

COMMIT;

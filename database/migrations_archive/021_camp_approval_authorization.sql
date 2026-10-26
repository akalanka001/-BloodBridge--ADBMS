-- Requires database-lead approval before applying to a shared database.
-- Procedure-only authorization correction. No table or relationship changes.
BEGIN;

CREATE OR REPLACE PROCEDURE sp_approve_donation_camp(p_camp_id UUID, p_staff_user_id UUID)
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
    SELECT 1 FROM blood_banks b WHERE b.id = v_camp.blood_bank_id AND b.is_verified
  ) THEN
    RAISE EXCEPTION 'Coordinating blood bank must be verified' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = p_staff_user_id AND u.is_active AND (
      u.role = 'ADMIN' OR (u.role = 'BANK_STAFF' AND EXISTS (
        SELECT 1 FROM staff_memberships sm
        WHERE sm.user_id = u.id AND sm.is_active
          AND sm.blood_bank_id = v_camp.blood_bank_id
      ))
    )
  ) THEN
    RAISE EXCEPTION 'User is not authorized for the verified coordinating bank' USING ERRCODE = '42501';
  END IF;
  UPDATE donation_camps SET status = 'APPROVED', approved_by = p_staff_user_id
  WHERE id = p_camp_id;
  INSERT INTO audit_logs(actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'donation_camps', p_camp_id::text, 'APPROVE');
  -- Caller owns COMMIT/ROLLBACK. Record the real approving actor, never a proxy.
END;
$$;

COMMIT;

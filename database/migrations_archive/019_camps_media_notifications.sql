-- BloodBridge Migration 019: Camps, Media, and Notification Management (Member 5)
-- PostgreSQL 16+ compliant. Run via scripts/migrate.js or test harness.

BEGIN;

-- 1. Media Assets Table
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  storage_path TEXT NOT NULL,
  alt_text TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Camp Media Link Table
CREATE TABLE IF NOT EXISTS camp_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES donation_camps(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 1,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (camp_id, media_id)
);

-- 3. Extend Donation Camps Table
ALTER TABLE donation_camps ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE donation_camps ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE donation_camps ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE donation_camps ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id);

-- 4. Extend Camp Registrations Table for Attendance Tracking
ALTER TABLE camp_registrations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE camp_registrations ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id);
ALTER TABLE camp_registrations ADD COLUMN IF NOT EXISTS attendance_notes TEXT;

-- 5. Extend Notifications Table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'IN_APP';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'ROUTINE';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'CAMP';

-- 6. Notification Deliveries Table (Multi-Channel Dispatch Ledger)
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  recipient_user_id UUID REFERENCES users(id),
  channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS')),
  destination TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'DELIVERED', 'FAILED')),
  idempotency_key TEXT UNIQUE,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  provider_message_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Operational Indexes
CREATE INDEX IF NOT EXISTS idx_camp_media_camp ON camp_media(camp_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recipient ON notification_deliveries(recipient_user_id, channel);
CREATE INDEX IF NOT EXISTS idx_donation_camps_staff_lookup ON donation_camps(blood_bank_id, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_donor_lookup ON camp_registrations(donor_id, status);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_camp_status ON camp_registrations(camp_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, status, created_at DESC);

-- 8. Stored Procedure: Cancel Donation Camp
CREATE OR REPLACE PROCEDURE sp_cancel_donation_camp(
  p_camp_id UUID,
  p_staff_user_id UUID,
  p_reason TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_camp donation_camps%ROWTYPE;
BEGIN
  SELECT * INTO v_camp
  FROM donation_camps WHERE id = p_camp_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Camp % does not exist', p_camp_id USING ERRCODE = 'P0002';
  END IF;

  IF v_camp.status IN ('CANCELLED', 'COMPLETED') THEN
    RAISE EXCEPTION 'Camp % is already % and cannot be cancelled', p_camp_id, v_camp.status USING ERRCODE = '23514';
  END IF;

  -- Staff authorization: must be active staff at the coordinating blood bank or admin
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_staff_user_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships sm
    WHERE sm.user_id = p_staff_user_id
      AND sm.blood_bank_id = v_camp.blood_bank_id
      AND sm.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Staff % is not authorized for blood bank %', p_staff_user_id, v_camp.blood_bank_id USING ERRCODE = '42501';
  END IF;

  UPDATE donation_camps
  SET status = 'CANCELLED',
      cancelled_by = p_staff_user_id,
      cancelled_at = now(),
      cancellation_reason = p_reason
  WHERE id = p_camp_id;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'donation_camps', p_camp_id::text, 'CANCEL_CAMP');

  INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'CAMP_CANCELLED',
    'donation_camps',
    p_camp_id::text,
    jsonb_build_object(
      'campId', p_camp_id,
      'title', v_camp.title,
      'reason', p_reason,
      'cancelledBy', p_staff_user_id
    )
  );
END;
$$;

-- 9. Stored Procedure: Camp Donor Check-in & Attendance Recording
CREATE OR REPLACE PROCEDURE sp_checkin_camp_donor(
  p_camp_id UUID,
  p_donor_id UUID,
  p_staff_user_id UUID,
  p_status TEXT,
  p_notes TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_camp donation_camps%ROWTYPE;
  v_reg RECORD;
BEGIN
  SELECT * INTO v_camp
  FROM donation_camps WHERE id = p_camp_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Camp % does not exist', p_camp_id USING ERRCODE = 'P0002';
  END IF;

  -- Verify staff authorization
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_staff_user_id AND role = 'ADMIN'
  ) AND NOT EXISTS (
    SELECT 1 FROM staff_memberships sm
    WHERE sm.user_id = p_staff_user_id
      AND sm.blood_bank_id = v_camp.blood_bank_id
      AND sm.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Staff % is not authorized for blood bank %', p_staff_user_id, v_camp.blood_bank_id USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('ATTENDED', 'NO_SHOW', 'REGISTERED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid attendance status: %', p_status USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_reg
  FROM camp_registrations
  WHERE camp_id = p_camp_id AND donor_id = p_donor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- On-the-spot walk-in registration at camp
    INSERT INTO camp_registrations (
      camp_id, donor_id, status, checked_in_at, checked_in_by, attendance_notes
    )
    VALUES (
      p_camp_id, p_donor_id, p_status,
      CASE WHEN p_status = 'ATTENDED' THEN now() ELSE NULL END,
      p_staff_user_id, p_notes
    );
  ELSE
    UPDATE camp_registrations
    SET status = p_status,
        checked_in_at = CASE WHEN p_status = 'ATTENDED' THEN now() ELSE checked_in_at END,
        checked_in_by = p_staff_user_id,
        attendance_notes = p_notes
    WHERE id = v_reg.id;
  END IF;

  INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
  VALUES (p_staff_user_id, 'camp_registrations', p_camp_id::text || ':' || p_donor_id::text, 'ATTENDANCE_' || p_status);
END;
$$;

-- 10. Operational View: Camp Management Detail (Bank Staff & Admin)
CREATE OR REPLACE VIEW v_camp_management_detail AS
SELECT
  c.id AS camp_id,
  c.title,
  c.description,
  c.status,
  c.starts_at,
  c.ends_at,
  c.capacity,
  c.public_contact,
  c.blood_bank_id,
  bb.name AS blood_bank_name,
  c.organizer_id,
  co.name AS organizer_name,
  co.phone AS organizer_phone,
  co.email AS organizer_email,
  c.location_id,
  loc.district_code,
  dist.name AS district_name,
  dist.province_code,
  pr.name AS province_name,
  loc.ds_code,
  ds.name AS ds_name,
  loc.town,
  loc.address_line AS venue_address,
  loc.latitude,
  loc.longitude,
  c.proposed_by,
  u_prop.full_name AS proposed_by_name,
  c.approved_by,
  u_appr.full_name AS approved_by_name,
  c.cancellation_reason,
  c.cancelled_at,
  c.created_at,
  COALESCE(reg.registered_count, 0)::int AS registered_count,
  COALESCE(reg.attended_count, 0)::int AS attended_count,
  COALESCE(reg.no_show_count, 0)::int AS no_show_count,
  med.media_id AS primary_media_id,
  med.storage_path AS primary_poster_url,
  med.alt_text AS primary_poster_alt
FROM donation_camps c
JOIN blood_banks bb ON bb.id = c.blood_bank_id
JOIN camp_organizers co ON co.id = c.organizer_id
JOIN locations loc ON loc.id = c.location_id
LEFT JOIN districts dist ON dist.code = loc.district_code
LEFT JOIN provinces pr ON pr.code = dist.province_code
LEFT JOIN ds_divisions ds ON ds.code = loc.ds_code AND ds.district_code = loc.district_code
LEFT JOIN users u_prop ON u_prop.id = c.proposed_by
LEFT JOIN users u_appr ON u_appr.id = c.approved_by
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE cr.status = 'REGISTERED') AS registered_count,
    count(*) FILTER (WHERE cr.status = 'ATTENDED') AS attended_count,
    count(*) FILTER (WHERE cr.status = 'NO_SHOW') AS no_show_count
  FROM camp_registrations cr
  WHERE cr.camp_id = c.id
) reg ON TRUE
LEFT JOIN LATERAL (
  SELECT cm.media_id, ma.storage_path, ma.alt_text
  FROM camp_media cm
  JOIN media_assets ma ON ma.id = cm.media_id
  WHERE cm.camp_id = c.id
  ORDER BY cm.is_primary DESC, cm.display_order ASC
  LIMIT 1
) med ON TRUE;

-- 11. Operational View: Donor Camp Registrations Ledger
CREATE OR REPLACE VIEW v_donor_camp_registrations AS
SELECT
  cr.id AS registration_id,
  cr.camp_id,
  cr.donor_id,
  d.user_id,
  cr.status AS registration_status,
  cr.registered_at,
  cr.checked_in_at,
  cr.attendance_notes,
  c.title AS camp_title,
  c.description AS camp_description,
  c.starts_at,
  c.ends_at,
  c.capacity,
  c.status AS camp_status,
  c.public_contact,
  bb.name AS coordinating_blood_bank,
  co.name AS organizer_name,
  loc.town,
  loc.address_line AS venue_address,
  dist.name AS district_name,
  med.storage_path AS poster_url
FROM camp_registrations cr
JOIN donors d ON d.id = cr.donor_id
JOIN donation_camps c ON c.id = cr.camp_id
JOIN blood_banks bb ON bb.id = c.blood_bank_id
JOIN camp_organizers co ON co.id = c.organizer_id
JOIN locations loc ON loc.id = c.location_id
JOIN districts dist ON dist.code = loc.district_code
LEFT JOIN LATERAL (
  SELECT ma.storage_path
  FROM camp_media cm
  JOIN media_assets ma ON ma.id = cm.media_id
  WHERE cm.camp_id = c.id
  ORDER BY cm.is_primary DESC, cm.display_order ASC
  LIMIT 1
) med ON TRUE;

-- 12. Operational View: Notification Inbox Details
CREATE OR REPLACE VIEW v_notification_inbox AS
SELECT
  n.id,
  n.recipient_user_id,
  n.camp_id,
  c.title AS camp_title,
  n.request_id,
  n.title,
  n.message,
  n.channel,
  n.priority,
  n.category,
  n.status,
  n.created_at
FROM notifications n
LEFT JOIN donation_camps c ON c.id = n.camp_id;

COMMIT;

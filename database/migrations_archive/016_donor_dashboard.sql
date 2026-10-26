-- ============================================================================
-- Migration 016: Donor Dashboard, Appointments, Targeted Invitations,
--                Granular Consent Channels, and Eligibility Review Calculation
-- ============================================================================
-- No standalone BEGIN/COMMIT: transaction managed atomically by scripts/migrate.js.

-- 1. Granular Contact Preferences on donor_consents & donor_consent_history
ALTER TABLE donor_consents
  ADD COLUMN IF NOT EXISTS sms_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS in_app_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE donor_consent_history
  ADD COLUMN IF NOT EXISTS sms_alerts BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS in_app_alerts BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in BOOLEAN DEFAULT FALSE;

-- Update trigger function to record all granular consent settings
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
    sms_alerts,
    email_alerts,
    in_app_alerts,
    newsletter_opt_in,
    recorded_at
  ) VALUES (
    NEW.donor_id,
    NEW.contact_allowed,
    NEW.camp_notification_opt_in,
    NEW.emergency_appeal_opt_in,
    NEW.sms_alerts,
    NEW.email_alerts,
    NEW.in_app_alerts,
    NEW.newsletter_opt_in,
    now()
  );
  RETURN NEW;
END;
$$;

-- 2. Donor Appointments Table (Booking, Confirmation & Cancellation)
CREATE TABLE IF NOT EXISTS donor_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  blood_bank_id BIGINT REFERENCES blood_banks(id),
  camp_id UUID REFERENCES donation_camps(id),
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  donation_type TEXT NOT NULL DEFAULT 'WHOLE_BLOOD'
    CHECK (donation_type IN ('WHOLE_BLOOD', 'PLATELETS', 'PLASMA')),
  status TEXT NOT NULL DEFAULT 'BOOKED'
    CHECK (status IN ('BOOKED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (blood_bank_id IS NOT NULL OR camp_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_donor_appointments_donor
  ON donor_appointments(donor_id, appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_donor_appointments_bank_date
  ON donor_appointments(blood_bank_id, appointment_date);

-- 3. Targeted Donor Invitations (Blood Bank / Hospital Requests -> Eligible Consented Donors)
CREATE TABLE IF NOT EXISTS donor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  blood_bank_id BIGINT REFERENCES blood_banks(id),
  hospital_id BIGINT REFERENCES hospitals(id),
  request_id UUID REFERENCES blood_requests(id),
  blood_type_code TEXT REFERENCES blood_types(code),
  urgency TEXT NOT NULL DEFAULT 'URGENT'
    CHECK (urgency IN ('CRITICAL', 'URGENT', 'ROUTINE')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  area_description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'INTERESTED', 'UNAVAILABLE', 'DISMISSED')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donor_invitations_donor
  ON donor_invitations(donor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donor_invitations_active
  ON donor_invitations(donor_id, expires_at DESC)
  WHERE status = 'PENDING';

-- 4. Function: Earliest Next Assessment Review Date & Deferral Status
CREATE OR REPLACE FUNCTION fn_donor_next_review_date(p_donor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_last_donation TIMESTAMPTZ;
  v_assessment_status TEXT;
  v_deferral_reason TEXT;
  v_deferral_until DATE;
  v_target_date DATE;
  v_is_deferred BOOLEAN := FALSE;
  v_days_until INT := 0;
  v_result JSONB;
BEGIN
  -- Get most recent completed collection
  SELECT max(collected_at)
  INTO v_last_donation
  FROM donations
  WHERE donor_id = p_donor_id
    AND process_status <> 'REJECTED';

  -- Get latest assessment record
  SELECT status, deferral_reason, deferral_until
  INTO v_assessment_status, v_deferral_reason, v_deferral_until
  FROM donor_assessments
  WHERE donor_id = p_donor_id
  ORDER BY assessed_at DESC
  LIMIT 1;

  -- Evaluate deferral
  IF v_assessment_status = 'PERMANENT_DEFERRAL' THEN
    v_is_deferred := TRUE;
    v_target_date := NULL;
    v_days_until := NULL;
  ELSIF v_assessment_status = 'TEMPORARY_DEFERRAL' AND v_deferral_until >= CURRENT_DATE THEN
    v_is_deferred := TRUE;
    v_target_date := v_deferral_until;
    v_days_until := (v_deferral_until - CURRENT_DATE);
  ELSE
    -- 120-day interval rule for whole blood donations
    IF v_last_donation IS NOT NULL THEN
      v_target_date := (v_last_donation + INTERVAL '120 days')::DATE;
      IF v_target_date < CURRENT_DATE THEN
        v_target_date := CURRENT_DATE;
        v_days_until := 0;
      ELSE
        v_days_until := (v_target_date - CURRENT_DATE);
      END IF;
    ELSE
      -- First time donor, eligible for assessment today
      v_target_date := CURRENT_DATE;
      v_days_until := 0;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'earliest_review_date', v_target_date,
    'days_until_review', v_days_until,
    'is_deferred', v_is_deferred,
    'deferral_status', COALESCE(v_assessment_status, 'NONE'),
    'deferral_reason', v_deferral_reason,
    'deferral_until', v_deferral_until,
    'last_donation_date', v_last_donation,
    'clearance_disclaimer', 'Calculated date represents earliest administrative assessment review and does not constitute medical transfusion clearance. Official screening occurs in-person with medical staff.'
  );

  RETURN v_result;
END;
$$;

-- 5. Operational View: Verified Completed Donation History
CREATE OR REPLACE VIEW v_verified_donation_history AS
SELECT dn.id,
       dn.id AS donation_id,
       dn.donor_id,
       dn.collected_at,
       dn.collected_volume_ml,
       dn.process_status,
       bb.id AS blood_bank_id,
       bb.name AS blood_bank_name,
       c.id AS camp_id,
       c.title AS camp_title,
       COALESCE(bb.name, c.title, 'National Blood Bank Network') AS location_name,
       to_char(dn.collected_at, 'DD Mon YYYY') AS formatted_date,
       to_char(dn.collected_at, 'HH24:MI') AS formatted_time
FROM donations dn
LEFT JOIN blood_banks bb ON bb.id = dn.blood_bank_id
LEFT JOIN donation_camps c ON c.id = dn.camp_id
WHERE dn.process_status <> 'REJECTED'
ORDER BY dn.collected_at DESC;

-- 6. Operational View: Complete Donor Dashboard Summary
CREATE OR REPLACE VIEW v_donor_dashboard_summary AS
SELECT d.id AS donor_id,
       d.user_id,
       COALESCE(u.full_name, d.full_name) AS full_name,
       COALESCE(u.email, d.email) AS email,
       COALESCE(u.phone, d.phone) AS phone,
       d.birth_date,
       d.weight_kg,
       d.blood_type_code,
       d.district_code,
       dist.name AS district_name,
       d.ds_code,
       ds.name AS ds_name,
       d.gn_code,
       d.town,
       d.available_for_contact,
       d.camp_notifications_opt_in,
       COALESCE(cons.sms_alerts, FALSE) AS sms_alerts,
       COALESCE(cons.email_alerts, FALSE) AS email_alerts,
       COALESCE(cons.in_app_alerts, TRUE) AS in_app_alerts,
       COALESCE(cons.newsletter_opt_in, FALSE) AS newsletter_opt_in,
       COALESCE(stats.total_donations, 0)::INT AS total_donations,
       stats.last_donation_date,
       COALESCE(inv.unread_invitations_count, 0)::INT AS unread_invitations_count,
       fn_donor_next_review_date(d.id) AS next_review_info
FROM donors d
LEFT JOIN users u ON u.id = d.user_id
LEFT JOIN districts dist ON dist.code = d.district_code
LEFT JOIN ds_divisions ds ON ds.code = d.ds_code AND ds.district_code = d.district_code
LEFT JOIN donor_consents cons ON cons.donor_id = d.id
LEFT JOIN LATERAL (
  SELECT count(*)::INT AS total_donations,
         max(collected_at) AS last_donation_date
  FROM donations
  WHERE donor_id = d.id AND process_status <> 'REJECTED'
) stats ON true
LEFT JOIN LATERAL (
  SELECT count(*)::INT AS unread_invitations_count
  FROM donor_invitations
  WHERE donor_id = d.id AND status = 'PENDING' AND expires_at >= now()
) inv ON true;

-- 7. Seed canonical demo invitations for demo donor account
DO $$
DECLARE
  v_demo_donor_id UUID;
  v_bank_id BIGINT;
BEGIN
  SELECT d.id INTO v_demo_donor_id
  FROM donors d
  JOIN users u ON u.id = d.user_id
  WHERE LOWER(u.email) = 'donor@bloodbridge.lk'
  LIMIT 1;

  SELECT id INTO v_bank_id FROM blood_banks ORDER BY id ASC LIMIT 1;

  IF v_demo_donor_id IS NOT NULL AND v_bank_id IS NOT NULL THEN
    -- Ensure 2 demo invitations matching 02-donor-dashboard.svg
    INSERT INTO donor_invitations (
      id, donor_id, blood_bank_id, blood_type_code, urgency,
      title, message, area_description, status, expires_at, created_at
    ) VALUES
      (
        'e1111111-1111-1111-1111-111111111111',
        v_demo_donor_id,
        v_bank_id,
        'O+',
        'CRITICAL',
        'Urgent O+ Red Cell Match Required',
        'Colombo National Blood Center has an urgent trauma match requirement.',
        'Colombo District · 4.2 km away',
        'PENDING',
        now() + INTERVAL '3 days',
        now() - INTERVAL '2 hours'
      ),
      (
        'e2222222-2222-2222-2222-222222222222',
        v_demo_donor_id,
        v_bank_id,
        'O+',
        'URGENT',
        'Weekend Community Camp Invitation',
        'Special blood collection camp scheduled for Saturday at Colombo Town Hall.',
        'Colombo District · 6.0 km away',
        'PENDING',
        now() + INTERVAL '5 days',
        now() - INTERVAL '1 day'
      )
    ON CONFLICT (id) DO NOTHING;

    -- Ensure initial donor_consents row exists
    INSERT INTO donor_consents (donor_id, contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in, sms_alerts, email_alerts, in_app_alerts)
    VALUES (v_demo_donor_id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (donor_id) DO UPDATE
    SET contact_allowed = TRUE, camp_notification_opt_in = TRUE, in_app_alerts = TRUE;
  END IF;
END $$;

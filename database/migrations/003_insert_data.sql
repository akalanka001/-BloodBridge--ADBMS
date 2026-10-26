-- ============================================================================
-- BloodBridge Database Refactoring: Insert Data & Reference Master Seeds
-- File: 003_insert_data.sql
-- Module: Reference Data, Master Dictionaries, Canonical Demo & Test Fixtures
-- Target: PostgreSQL 16+
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADMINISTRATIVE GEOGRAPHY: PROVINCES (All 9 Sri Lankan Provinces)
-- ============================================================================
INSERT INTO provinces (code, name) VALUES
  ('WP',  'Western Province'),
  ('CP',  'Central Province'),
  ('SP',  'Southern Province'),
  ('NP',  'Northern Province'),
  ('EP',  'Eastern Province'),
  ('NWP', 'North Western Province'),
  ('NCP', 'North Central Province'),
  ('UP',  'Uva Province'),
  ('SGP', 'Sabaragamuwa Province')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. ADMINISTRATIVE GEOGRAPHY: DISTRICTS (All 25 Sri Lankan Districts)
-- ============================================================================
INSERT INTO districts (code, province_code, name) VALUES
  -- Western Province
  ('CO',  'WP',  'Colombo'),
  ('GA',  'WP',  'Gampaha'),
  ('KA',  'WP',  'Kalutara'),
  -- Central Province
  ('KD',  'CP',  'Kandy'),
  ('MT',  'CP',  'Matale'),
  ('NE',  'CP',  'Nuwara Eliya'),
  -- Southern Province
  ('GL',  'SP',  'Galle'),
  ('MA',  'SP',  'Matara'),
  ('HB',  'SP',  'Hambantota'),
  -- Northern Province
  ('JA',  'NP',  'Jaffna'),
  ('KI',  'NP',  'Kilinochchi'),
  ('MN',  'NP',  'Mannar'),
  ('VA',  'NP',  'Vavuniya'),
  ('MU',  'NP',  'Mullaitivu'),
  -- Eastern Province
  ('BT',  'EP',  'Batticaloa'),
  ('AM',  'EP',  'Ampara'),
  ('TR',  'EP',  'Trincomalee'),
  -- North Western Province
  ('KU',  'NWP', 'Kurunegala'),
  ('PU',  'NWP', 'Puttalam'),
  -- North Central Province
  ('AN',  'NCP', 'Anuradhapura'),
  ('PO',  'NCP', 'Polonnaruwa'),
  -- Uva Province
  ('BD',  'UP',  'Badulla'),
  ('MO',  'UP',  'Monaragala'),
  -- Sabaragamuwa Province
  ('RN',  'SGP', 'Ratnapura'),
  ('KG',  'SGP', 'Kegalle')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. ADMINISTRATIVE GEOGRAPHY: DIVISIONAL SECRETARIAT (DS) DIVISIONS
-- ============================================================================
INSERT INTO ds_divisions (code, district_code, name, source_date) VALUES
  ('MAH', 'CO', 'Maharagama', '2026-01-01'),
  ('COL', 'CO', 'Colombo', '2026-01-01'),
  ('SJP', 'CO', 'Sri Jayawardenepura Kotte', '2026-01-01'),
  ('THI', 'CO', 'Thimbirigasyaya', '2026-01-01'),
  ('MOR', 'CO', 'Moratuwa', '2026-01-01'),
  ('KES', 'CO', 'Kesbewa', '2026-01-01'),
  ('NEG', 'GA', 'Negombo', '2026-01-01'),
  ('GAM', 'GA', 'Gampaha', '2026-01-01'),
  ('KEL', 'GA', 'Kelaniya', '2026-01-01'),
  ('PAN', 'KA', 'Panadura', '2026-01-01'),
  ('KAL', 'KA', 'Kalutara', '2026-01-01'),
  ('KAD', 'KD', 'Kandy Four Gravets and Gangawata Korale', '2026-01-01'),
  ('YAT', 'KD', 'Yatinuwara', '2026-01-01'),
  ('GAL', 'GL', 'Galle Four Gravets', '2026-01-01'),
  ('HIK', 'GL', 'Hikkaduwa', '2026-01-01'),
  ('JAF', 'JA', 'Jaffna', '2026-01-01'),
  ('KUR', 'KU', 'Kurunegala', '2026-01-01'),
  ('ANU', 'AN', 'Nuwaragam Palatha Central', '2026-01-01')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  district_code = EXCLUDED.district_code,
  source_date = EXCLUDED.source_date;

-- ============================================================================
-- 4. ADMINISTRATIVE GEOGRAPHY: GRAMA NILADHARI (GN) DIVISIONS
-- ============================================================================
INSERT INTO gn_divisions (code, ds_code, district_code, name, source_date) VALUES
  ('529', 'MAH', 'CO', 'Maharagama Town', '2026-01-01'),
  ('529A', 'MAH', 'CO', 'Maharagama West', '2026-01-01'),
  ('530', 'MAH', 'CO', 'Pamunuwa', '2026-01-01'),
  ('531', 'MAH', 'CO', 'Navinna', '2026-01-01'),
  ('514', 'COL', 'CO', 'Fort', '2026-01-01'),
  ('515', 'COL', 'CO', 'Kompanna Veediya', '2026-01-01'),
  ('518', 'THI', 'CO', 'Kollupitiya', '2026-01-01'),
  ('519', 'THI', 'CO', 'Bambalapitiya', '2026-01-01'),
  ('520', 'SJP', 'CO', 'Nawala', '2026-01-01'),
  ('521', 'SJP', 'CO', 'Rajagiriya', '2026-01-01'),
  ('101', 'KEL', 'GA', 'Kelaniya Town', '2026-01-01'),
  ('102', 'KEL', 'GA', 'Dalugama', '2026-01-01'),
  ('201', 'GAL', 'GL', 'Fort (Galle)', '2026-01-01'),
  ('202', 'GAL', 'GL', 'Kaluwella', '2026-01-01')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  ds_code = EXCLUDED.ds_code,
  district_code = EXCLUDED.district_code,
  source_date = EXCLUDED.source_date;

-- ============================================================================
-- 5. CLINICAL MASTER DATA: BLOOD TYPES & COMPONENT TYPES
-- ============================================================================
INSERT INTO blood_types (code) VALUES
  ('O-'), ('O+'), ('A-'), ('A+'), ('B-'), ('B+'), ('AB-'), ('AB+')
ON CONFLICT (code) DO NOTHING;

INSERT INTO component_types (code, name) VALUES
  ('RBC',       'Packed Red Blood Cells (PRBC)'),
  ('PLASMA',    'Fresh Frozen Plasma (FFP)'),
  ('PLATELETS', 'Random / Apheresis Platelets')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 6. PHYSICAL VENUES & LOCATIONS
-- ============================================================================
INSERT INTO locations (district_code, ds_code, town, address_line, latitude, longitude)
SELECT 'CO', 'MAH', 'Maharagama', 'DEMO Maharagama, Fictional demo venue — academic prototype', 6.848000, 79.926700
WHERE NOT EXISTS (
  SELECT 1 FROM locations WHERE district_code = 'CO' AND town = 'Maharagama'
);

INSERT INTO locations (district_code, ds_code, town, address_line, latitude, longitude)
SELECT 'CO', 'COL', 'Colombo', 'National Hospital of Sri Lanka, Regent Street, Colombo 08', 6.917500, 79.865800
WHERE NOT EXISTS (
  SELECT 1 FROM locations WHERE district_code = 'CO' AND town = 'Colombo'
);

-- ============================================================================
-- 7. HEALTHCARE INSTITUTIONS & REGIONAL CLUSTERS
-- ============================================================================
DO $$
DECLARE
  v_loc_id BIGINT;
  v_hosp_id BIGINT;
  v_bank_id BIGINT;
  v_cluster_id BIGINT;
BEGIN
  SELECT id INTO v_loc_id FROM locations WHERE district_code = 'CO' ORDER BY id ASC LIMIT 1;

  -- Ensure demo cluster exists
  SELECT id INTO v_cluster_id FROM blood_bank_clusters WHERE cluster_code = 'LK-01';
  IF v_cluster_id IS NULL THEN
    INSERT INTO blood_bank_clusters (cluster_code, name, district_code)
    VALUES ('LK-01', 'Western Central Cluster (NBTS Narahenpita)', 'CO')
    RETURNING id INTO v_cluster_id;
  END IF;

  -- Ensure demo hospital exists
  SELECT id INTO v_hosp_id FROM hospitals WHERE name = 'DEMO Teaching Hospital';
  IF v_hosp_id IS NULL THEN
    INSERT INTO hospitals (name, location_id, contact_phone, is_verified)
    VALUES ('DEMO Teaching Hospital', v_loc_id, '0112691111', TRUE)
    RETURNING id INTO v_hosp_id;
  END IF;

  -- Ensure demo blood bank exists
  SELECT id INTO v_bank_id FROM blood_banks WHERE name = 'DEMO Blood Bank';
  IF v_bank_id IS NULL THEN
    INSERT INTO blood_banks (name, location_id, hospital_id, cluster_id, contact_phone, is_verified)
    VALUES ('DEMO Blood Bank', v_loc_id, v_hosp_id, v_cluster_id, '0112691112', TRUE)
    RETURNING id INTO v_bank_id;
  END IF;

  -- Ensure second regional blood bank exists for transfer workflows
  IF NOT EXISTS (SELECT 1 FROM blood_banks WHERE name = 'DEMO Regional Blood Bank (Kandy)') THEN
    INSERT INTO blood_banks (name, location_id, hospital_id, cluster_id, contact_phone, is_verified)
    VALUES ('DEMO Regional Blood Bank (Kandy)', v_loc_id, v_hosp_id, v_cluster_id, '0812233445', TRUE);
  END IF;

  -- Ensure demo camp organizer exists
  IF NOT EXISTS (SELECT 1 FROM camp_organizers WHERE name = 'DEMO Volunteer Society') THEN
    INSERT INTO camp_organizers (name, email, phone, is_verified)
    VALUES ('DEMO Volunteer Society', 'volunteers@bloodbridge.lk', '0112345678', TRUE);
  END IF;
END $$;

-- ============================================================================
-- 8. CANONICAL SYSTEM USERS (BCrypt Password: "BloodBridge2026!")
-- ============================================================================
INSERT INTO users (full_name, email, phone, password_hash, role, is_active, email_verified)
VALUES
  -- 1. System Administrator
  ('System Administrator', 'admin@bloodbridge.lk', '0701122334',
   '$2a$12$wLQ6ibV8umjPdrykNps9QOejp41QmY0r2cUmZVre7RsmGUJS2amkO', 'ADMIN', TRUE, TRUE),

  -- 2. Hospital Staff
  ('Dr. Dilani Jayawardena', 'hospital@bloodbridge.lk', '0714567890',
   '$2a$12$wLQ6ibV8umjPdrykNps9QOejp41QmY0r2cUmZVre7RsmGUJS2amkO', 'HOSPITAL_STAFF', TRUE, TRUE),

  -- 3. Blood Bank Staff
  ('Kasun Wickramasinghe', 'bank@bloodbridge.lk', '0723456789',
   '$2a$12$wLQ6ibV8umjPdrykNps9QOejp41QmY0r2cUmZVre7RsmGUJS2amkO', 'BANK_STAFF', TRUE, TRUE),

  -- 4. Registered Public Donor
  ('Nimal Perera', 'donor@bloodbridge.lk', '0771234567',
   '$2a$12$wLQ6ibV8umjPdrykNps9QOejp41QmY0r2cUmZVre7RsmGUJS2amkO', 'DONOR', TRUE, TRUE),

  -- Test Aliases for Backward Compatibility
  ('DEMO Administrator', 'demo-admin@bloodbridge.test', '0700000001',
   '$2a$12$wLQ6ibV8umjPdrykNps9QOejp41QmY0r2cUmZVre7RsmGUJS2amkO', 'ADMIN', TRUE, TRUE),

  ('DEMO Hospital Staff', 'demo-hospital@bloodbridge.test', '0700000002',
   '$2a$12$wLQ6ibV8umjPdrykNps9QOejp41QmY0r2cUmZVre7RsmGUJS2amkO', 'HOSPITAL_STAFF', TRUE, TRUE),

  ('DEMO Blood Bank Staff', 'demo-bank@bloodbridge.test', '0700000003',
   '$2a$12$wLQ6ibV8umjPdrykNps9QOejp41QmY0r2cUmZVre7RsmGUJS2amkO', 'BANK_STAFF', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = TRUE,
  email_verified = TRUE;

-- ============================================================================
-- 9. STAFF INSTITUTIONAL MEMBERSHIPS & DONOR SEEDING
-- ============================================================================
DO $$
DECLARE
  v_admin_id UUID;
  v_hosp_user_id UUID;
  v_bank_user_id UUID;
  v_donor_user_id UUID;
  v_legacy_hosp_id UUID;
  v_legacy_bank_id UUID;
  v_hosp_id BIGINT;
  v_bank_id BIGINT;
  v_donor_id UUID;
  v_loc_id BIGINT;
  v_organizer_id BIGINT;
  v_camp_id UUID;
  v_donation_id UUID;
BEGIN
  SELECT id INTO v_hosp_user_id FROM users WHERE LOWER(email) = 'hospital@bloodbridge.lk';
  SELECT id INTO v_bank_user_id FROM users WHERE LOWER(email) = 'bank@bloodbridge.lk';
  SELECT id INTO v_donor_user_id FROM users WHERE LOWER(email) = 'donor@bloodbridge.lk';
  SELECT id INTO v_legacy_hosp_id FROM users WHERE LOWER(email) = 'demo-hospital@bloodbridge.test';
  SELECT id INTO v_legacy_bank_id FROM users WHERE LOWER(email) = 'demo-bank@bloodbridge.test';

  SELECT id INTO v_hosp_id FROM hospitals WHERE name = 'DEMO Teaching Hospital' LIMIT 1;
  SELECT id INTO v_bank_id FROM blood_banks WHERE name = 'DEMO Blood Bank' LIMIT 1;
  SELECT id INTO v_loc_id FROM locations WHERE district_code = 'CO' LIMIT 1;
  SELECT id INTO v_organizer_id FROM camp_organizers WHERE name = 'DEMO Volunteer Society' LIMIT 1;

  -- Link hospital staff memberships
  IF v_hosp_user_id IS NOT NULL AND v_hosp_id IS NOT NULL THEN
    INSERT INTO staff_memberships (user_id, hospital_id, is_active)
    VALUES (v_hosp_user_id, v_hosp_id, TRUE)
    ON CONFLICT (user_id, hospital_id) DO UPDATE SET is_active = TRUE;
  END IF;

  IF v_legacy_hosp_id IS NOT NULL AND v_hosp_id IS NOT NULL THEN
    INSERT INTO staff_memberships (user_id, hospital_id, is_active)
    VALUES (v_legacy_hosp_id, v_hosp_id, TRUE)
    ON CONFLICT (user_id, hospital_id) DO UPDATE SET is_active = TRUE;
  END IF;

  -- Link bank staff memberships
  IF v_bank_user_id IS NOT NULL AND v_bank_id IS NOT NULL THEN
    INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
    VALUES (v_bank_user_id, v_bank_id, TRUE)
    ON CONFLICT (user_id, blood_bank_id) DO UPDATE SET is_active = TRUE;
  END IF;

  IF v_legacy_bank_id IS NOT NULL AND v_bank_id IS NOT NULL THEN
    INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
    VALUES (v_legacy_bank_id, v_bank_id, TRUE)
    ON CONFLICT (user_id, blood_bank_id) DO UPDATE SET is_active = TRUE;
  END IF;

  -- Ensure donor profile
  IF v_donor_user_id IS NOT NULL THEN
    SELECT id INTO v_donor_id FROM donors WHERE user_id = v_donor_user_id;
    IF v_donor_id IS NULL THEN
      INSERT INTO donors (
        user_id, full_name, phone, email, registration_origin,
        blood_type_code, district_code, ds_code, town, birth_date, weight_kg,
        available_for_contact, camp_notifications_opt_in
      ) VALUES (
        v_donor_user_id, 'Nimal Perera', '0771234567', 'donor@bloodbridge.lk', 'ONLINE',
        'O+', 'CO', 'MAH', 'Maharagama', '1996-05-15', 68.0,
        TRUE, TRUE
      )
      RETURNING id INTO v_donor_id;
    ELSE
      UPDATE donors
      SET blood_type_code = 'O+', district_code = 'CO', ds_code = 'MAH',
          birth_date = '1996-05-15', weight_kg = 68.0, town = 'Maharagama',
          available_for_contact = TRUE, camp_notifications_opt_in = TRUE
      WHERE id = v_donor_id;
    END IF;

    -- Ensure donor consents
    INSERT INTO donor_consents (
      donor_id, contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in,
      sms_alerts, email_alerts, in_app_alerts, newsletter_opt_in
    ) VALUES (
      v_donor_id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE
    )
    ON CONFLICT (donor_id) DO UPDATE SET
      contact_allowed = TRUE,
      camp_notification_opt_in = TRUE,
      in_app_alerts = TRUE;

    -- Seed completed donation history if none exists
    IF NOT EXISTS (SELECT 1 FROM donations WHERE donor_id = v_donor_id) AND v_bank_id IS NOT NULL THEN
      INSERT INTO donations (donor_id, blood_bank_id, collected_at, collected_volume_ml, process_status)
      VALUES
        (v_donor_id, v_bank_id, '2026-01-15 09:30:00+05:30', 450, 'PROCESSED'),
        (v_donor_id, v_bank_id, '2026-03-12 10:15:00+05:30', 450, 'PROCESSED'),
        (v_donor_id, v_bank_id, '2026-05-18 11:00:00+05:30', 450, 'PROCESSED'),
        (v_donor_id, v_bank_id, '2026-07-10 14:20:00+05:30', 450, 'PROCESSED'),
        (v_donor_id, v_bank_id, '2026-09-08 09:45:00+05:30', 450, 'PROCESSED'),
        (v_donor_id, v_bank_id, '2026-10-19 10:30:00+05:30', 450, 'PROCESSED');
    END IF;
  END IF;

  -- Ensure upcoming donation camp
  IF v_organizer_id IS NOT NULL AND v_bank_id IS NOT NULL AND v_loc_id IS NOT NULL AND v_bank_user_id IS NOT NULL THEN
    SELECT id INTO v_camp_id FROM donation_camps WHERE title = 'DEMO Community Donation Camp';
    IF v_camp_id IS NULL THEN
      INSERT INTO donation_camps (
        title, organizer_id, blood_bank_id, location_id, proposed_by, approved_by,
        starts_at, ends_at, capacity, status, public_contact
      ) VALUES (
        'DEMO Community Donation Camp', v_organizer_id, v_bank_id, v_loc_id,
        v_bank_user_id, v_bank_user_id,
        now() + INTERVAL '21 days', now() + INTERVAL '21 days 5 hours', 80,
        'APPROVED', '0112345678'
      )
      RETURNING id INTO v_camp_id;

      INSERT INTO camp_target_areas (camp_id, district_code, ds_code, radius_km)
      VALUES (v_camp_id, 'CO', 'MAH', 15.0)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Ensure sample released units exist in inventory
  IF v_bank_id IS NOT NULL AND v_bank_user_id IS NOT NULL THEN
    SELECT id INTO v_donation_id FROM donations ORDER BY collected_at DESC LIMIT 1;
    IF v_donation_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM blood_units WHERE blood_bank_id = v_bank_id AND release_status = 'RELEASED') THEN
        INSERT INTO blood_units (
          donation_id, blood_bank_id, blood_type_code, component_code, volume_ml,
          collected_at, expires_at, release_status, inventory_status, released_by, released_at
        ) VALUES
          (v_donation_id, v_bank_id, 'O+', 'RBC', 450, now() - INTERVAL '2 days', now() + INTERVAL '33 days', 'RELEASED', 'IN_STOCK', v_bank_user_id, now() - INTERVAL '1 day'),
          (v_donation_id, v_bank_id, 'O-', 'RBC', 450, now() - INTERVAL '5 days', now() + INTERVAL '30 days', 'RELEASED', 'IN_STOCK', v_bank_user_id, now() - INTERVAL '4 days'),
          (v_donation_id, v_bank_id, 'A+', 'PLATELETS', 250, now() - INTERVAL '1 day', now() + INTERVAL '4 days', 'RELEASED', 'IN_STOCK', v_bank_user_id, now() - INTERVAL '12 hours'),
          (v_donation_id, v_bank_id, 'B+', 'PLASMA', 300, now() - INTERVAL '10 days', now() + INTERVAL '355 days', 'RELEASED', 'IN_STOCK', v_bank_user_id, now() - INTERVAL '8 days');
      END IF;
    END IF;
  END IF;
END $$;

-- Refresh analytical materialized view
REFRESH MATERIALIZED VIEW mv_monthly_donation_counts;

COMMIT;

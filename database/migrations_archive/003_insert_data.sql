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
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

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
ON CONFLICT (code) DO UPDATE SET province_code = EXCLUDED.province_code, name = EXCLUDED.name;

-- ============================================================================
-- 3. ADMINISTRATIVE GEOGRAPHY: DIVISIONAL SECRETARIAT (DS) DIVISIONS
-- ============================================================================
INSERT INTO ds_divisions (code, district_code, name) VALUES
  ('COL', 'CO', 'Colombo'),
  ('MAH', 'CO', 'Maharagama'),
  ('DEH', 'CO', 'Dehiwala'),
  ('MOR', 'CO', 'Moratuwa'),
  ('KAD', 'CO', 'Kaduwela'),
  ('NEG', 'GA', 'Negombo'),
  ('GAM', 'GA', 'Gampaha'),
  ('KEL', 'GA', 'Kelaniya'),
  ('KAL', 'KA', 'Kalutara'),
  ('PAN', 'KA', 'Panadura'),
  ('KAN', 'KD', 'Kandy Four Gravets and Gangawata Korale'),
  ('PER', 'KD', 'Yatinuwara (Peradeniya)'),
  ('GAL', 'GL', 'Galle Four Gravets'),
  ('JAF', 'JA', 'Jaffna'),
  ('KUR', 'KU', 'Kurunegala'),
  ('ANU', 'AN', 'Nuwaragam Palatha Central (Anuradhapura)')
ON CONFLICT (code, district_code) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 4. ADMINISTRATIVE GEOGRAPHY: GRAMA NILADHARI (GN) DIVISIONS
-- ============================================================================
INSERT INTO gn_divisions (code, ds_code, district_code, name) VALUES
  ('MAH-528', 'MAH', 'CO', 'Pamunuwa'),
  ('MAH-529', 'MAH', 'CO', 'Maharagama West'),
  ('MAH-530', 'MAH', 'CO', 'Maharagama East'),
  ('COL-501', 'COL', 'CO', 'Fort'),
  ('COL-502', 'COL', 'CO', 'Kollupitiya'),
  ('COL-503', 'COL', 'CO', 'Bambalapitiya'),
  ('KAN-101', 'KAN', 'KD', 'Kandy Central'),
  ('GAL-201', 'GAL', 'GL', 'Galle Fort')
ON CONFLICT (code) DO NOTHING;

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
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 6. PHYSICAL VENUES & LOCATIONS
-- ============================================================================
INSERT INTO locations (id, district_code, ds_code, town, address_line, latitude, longitude)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'CO', 'MAH', 'Maharagama', 'National Blood Transfusion Service Head Office, Narahenpita / Maharagama Road', 6.848000, 79.926700),
  (2, 'CO', 'COL', 'Colombo', 'National Hospital of Sri Lanka, Regent Street, Colombo 08', 6.917500, 79.865800),
  (3, 'KD', 'KAN', 'Kandy', 'General Hospital Kandy, Hospital Square, Kandy', 7.290600, 80.633700),
  (4, 'GL', 'GAL', 'Galle', 'Teaching Hospital Karapitiya, Karapitiya, Galle', 6.068400, 80.228100)
ON CONFLICT (id) DO NOTHING;

-- Synchronize locations sequence
SELECT setval(pg_get_serial_sequence('locations', 'id'), COALESCE((SELECT MAX(id) FROM locations), 1));

-- ============================================================================
-- 7. HEALTHCARE INSTITUTIONS & REGIONAL CLUSTERS
-- ============================================================================
INSERT INTO hospitals (id, name, location_id, contact_phone, is_verified)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'DEMO Teaching Hospital', 2, '0112691111', TRUE),
  (2, 'Colombo South Teaching Hospital (Kalubowila)', 1, '0112763066', TRUE),
  (3, 'General Hospital Kandy', 3, '0812222261', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('hospitals', 'id'), COALESCE((SELECT MAX(id) FROM hospitals), 1));

INSERT INTO blood_bank_clusters (id, cluster_code, name, lead_hospital_id, district_code)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'LK-01', 'Western Central Cluster (NBTS Narahenpita)', 1, 'CO'),
  (2, 'LK-02', 'Central Regional Cluster (Kandy)', 3, 'KD')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('blood_bank_clusters', 'id'), COALESCE((SELECT MAX(id) FROM blood_bank_clusters), 1));

INSERT INTO blood_banks (id, name, location_id, hospital_id, cluster_id, contact_phone, is_verified)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'DEMO Blood Bank', 1, 1, 1, '0112691112', TRUE),
  (2, 'National Blood Center (NBTS Narahenpita)', 2, 1, 1, '0112369931', TRUE),
  (3, 'Kandy Regional Blood Center', 3, 3, 2, '0812233337', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('blood_banks', 'id'), COALESCE((SELECT MAX(id) FROM blood_banks), 1));

INSERT INTO camp_organizers (id, name, email, phone, is_verified)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'DEMO Volunteer Society', 'volunteers@bloodbridge.lk', '0112345678', TRUE),
  (2, 'Sri Lanka Red Cross Society (Colombo Branch)', 'redcross.colombo@example.org', '0112695434', TRUE),
  (3, 'Lions Club District 306A1', 'lions306@example.org', '0112501234', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('camp_organizers', 'id'), COALESCE((SELECT MAX(id) FROM camp_organizers), 1));

-- ============================================================================
-- 8. CANONICAL SYSTEM USERS (BCrypt Password: "BloodBridge2026!")
-- Standard hash: $2a$12$6t6L5hX4xY3H1BwZ6L0q..vG4c.X5jK9kE8uQ2mP0oY3t7r8s9a1u
-- ============================================================================
INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active, email_verified)
VALUES
  -- 1. System Administrator
  ('a0000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@bloodbridge.lk', '0701122334',
   '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW', 'ADMIN', TRUE, TRUE),

  -- 2. Hospital Staff (Doctor)
  ('b0000000-0000-0000-0000-000000000002', 'Dr. Dilani Jayawardena', 'hospital@bloodbridge.lk', '0714567890',
   '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW', 'HOSPITAL_STAFF', TRUE, TRUE),

  -- 3. Blood Bank Staff (Medical Officer / Phlebotomist)
  ('c0000000-0000-0000-0000-000000000003', 'Kasun Wickramasinghe', 'bank@bloodbridge.lk', '0723456789',
   '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW', 'BANK_STAFF', TRUE, TRUE),

  -- 4. Registered Public Donor
  ('d0000000-0000-0000-0000-000000000004', 'Nimal Perera', 'donor@bloodbridge.lk', '0771234567',
   '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW', 'DONOR', TRUE, TRUE),

  -- Test Aliases for Backward Compatibility
  ('a0000000-0000-0000-0000-000000000005', 'DEMO Administrator', 'demo-admin@bloodbridge.test', '0700000001',
   '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW', 'ADMIN', TRUE, TRUE),

  ('b0000000-0000-0000-0000-000000000006', 'DEMO Hospital Staff', 'demo-hospital@bloodbridge.test', '0700000002',
   '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW', 'HOSPITAL_STAFF', TRUE, TRUE),

  ('c0000000-0000-0000-0000-000000000007', 'DEMO Blood Bank Staff', 'demo-bank@bloodbridge.test', '0700000003',
   '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW', 'BANK_STAFF', TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = TRUE;

-- ============================================================================
-- 9. STAFF INSTITUTIONAL MEMBERSHIPS
-- ============================================================================
INSERT INTO staff_memberships (user_id, hospital_id, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000002', 1, TRUE),
  ('b0000000-0000-0000-0000-000000000006', 1, TRUE)
ON CONFLICT (user_id, hospital_id) DO UPDATE SET is_active = TRUE;

INSERT INTO staff_memberships (user_id, blood_bank_id, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000003', 1, TRUE),
  ('c0000000-0000-0000-0000-000000000007', 1, TRUE)
ON CONFLICT (user_id, blood_bank_id) DO UPDATE SET is_active = TRUE;

-- ============================================================================
-- 10. CANONICAL DONOR PROFILE & PRIVACY CONSENT
-- ============================================================================
INSERT INTO donors (
  id, user_id, full_name, phone, email, registration_origin,
  blood_type_code, district_code, ds_code, town, birth_date, weight_kg,
  available_for_contact, camp_notifications_opt_in
) VALUES (
  'd1111111-1111-1111-1111-111111111111',
  'd0000000-0000-0000-0000-000000000004',
  'Nimal Perera', '0771234567', 'donor@bloodbridge.lk', 'ONLINE',
  'O+', 'CO', 'MAH', 'Maharagama', '1996-05-15', 68.0,
  TRUE, TRUE
)
ON CONFLICT (user_id) DO UPDATE SET
  blood_type_code = 'O+',
  district_code = 'CO',
  ds_code = 'MAH',
  town = 'Maharagama',
  birth_date = '1996-05-15',
  weight_kg = 68.0,
  available_for_contact = TRUE,
  camp_notifications_opt_in = TRUE;

INSERT INTO donor_consents (
  donor_id, contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in,
  sms_alerts, email_alerts, in_app_alerts, newsletter_opt_in
) VALUES (
  'd1111111-1111-1111-1111-111111111111',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE
)
ON CONFLICT (donor_id) DO UPDATE SET
  contact_allowed = TRUE,
  camp_notification_opt_in = TRUE,
  emergency_appeal_opt_in = TRUE,
  in_app_alerts = TRUE;

-- ============================================================================
-- 11. CANONICAL DONATION HISTORY (Completed Phlebotomy Timeline)
-- ============================================================================
INSERT INTO donations (
  id, donor_id, blood_bank_id, collected_at, collected_volume_ml, process_status
) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 1, '2026-01-15 09:30:00+05:30', 450, 'PROCESSED'),
  ('d0000001-0000-0000-0000-000000000002', 'd1111111-1111-1111-1111-111111111111', 1, '2026-03-12 10:15:00+05:30', 450, 'PROCESSED'),
  ('d0000001-0000-0000-0000-000000000003', 'd1111111-1111-1111-1111-111111111111', 1, '2026-05-18 11:00:00+05:30', 450, 'PROCESSED'),
  ('d0000001-0000-0000-0000-000000000004', 'd1111111-1111-1111-1111-111111111111', 1, '2026-07-10 14:20:00+05:30', 450, 'PROCESSED'),
  ('d0000001-0000-0000-0000-000000000005', 'd1111111-1111-1111-1111-111111111111', 1, '2026-09-08 09:45:00+05:30', 450, 'PROCESSED'),
  ('d0000001-0000-0000-0000-000000000006', 'd1111111-1111-1111-1111-111111111111', 1, '2026-10-19 10:30:00+05:30', 450, 'PROCESSED')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. INITIAL APPROVED UPCOMING DONATION DRIVE (Mobile Camp)
-- ============================================================================
INSERT INTO donation_camps (
  id, title, description, organizer_id, blood_bank_id, location_id,
  proposed_by, approved_by, starts_at, ends_at, capacity, status, public_contact
) VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'DEMO Community Donation Camp',
  'Annual community voluntary blood donation drive organized with local welfare societies.',
  1, 1, 1,
  'c0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000003',
  now() + INTERVAL '21 days',
  now() + INTERVAL '21 days 5 hours',
  80,
  'APPROVED',
  '0112345678'
)
ON CONFLICT (id) DO NOTHING;

-- Target notification area for upcoming camp
INSERT INTO camp_target_areas (camp_id, district_code, ds_code, radius_km) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'CO', 'MAH', 15.0)
ON CONFLICT (camp_id, district_code, ds_code) DO NOTHING;

-- ============================================================================
-- 13. DEMO INVITATIONS & NOTIFICATIONS
-- ============================================================================
INSERT INTO donor_invitations (
  id, donor_id, blood_bank_id, blood_type_code, urgency,
  title, message, area_description, status, expires_at, created_at
) VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    1, 'O+', 'CRITICAL',
    'City Blood Center Match Request',
    'Urgent O+ Red Cell requirement for trauma care at City Blood Center.',
    'Colombo District · 4.2 km away',
    'PENDING',
    now() + INTERVAL '3 days',
    now() - INTERVAL '2 hours'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'd1111111-1111-1111-1111-111111111111',
    1, 'O+', 'URGENT',
    'Community Blood Drive Invitation',
    'Upcoming donation drive at Colombo Town Hall.',
    'Colombo District · 6.0 km away',
    'PENDING',
    now() + INTERVAL '5 days',
    now() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- Initial system welcome notification
INSERT INTO notifications (
  id, recipient_user_id, camp_id, title, message, channel, priority, category, status
) VALUES (
  'f1111111-1111-1111-1111-111111111111',
  'd0000000-0000-0000-0000-000000000004',
  'c1111111-1111-1111-1111-111111111111',
  'Welcome to BloodBridge',
  'Thank you for joining the Sri Lanka voluntary donor network. Your participation saves lives.',
  'IN_APP', 'ROUTINE', 'SYSTEM', 'UNREAD'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 14. INITIAL RELEASED BLOOD INVENTORY FIXTURES
-- ============================================================================
INSERT INTO blood_units (
  id, donation_id, blood_bank_id, blood_type_code, component_code,
  volume_ml, collected_at, expires_at, release_status, inventory_status, released_by, released_at
) VALUES
  -- O+ Packed Red Blood Cells (Valid 35 days)
  ('u1111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000006', 1, 'O+', 'RBC',
   450, now() - INTERVAL '2 days', now() + INTERVAL '33 days', 'RELEASED', 'IN_STOCK',
   'c0000000-0000-0000-0000-000000000003', now() - INTERVAL '1 day'),

  -- O- Packed Red Blood Cells (Universal donor, highly valuable)
  ('u2222222-2222-2222-2222-222222222222', 'd0000001-0000-0000-0000-000000000006', 1, 'O-', 'RBC',
   450, now() - INTERVAL '5 days', now() + INTERVAL '30 days', 'RELEASED', 'IN_STOCK',
   'c0000000-0000-0000-0000-000000000003', now() - INTERVAL '4 days'),

  -- A+ Platelets (Valid 5 days)
  ('u3333333-3333-3333-3333-333333333333', 'd0000001-0000-0000-0000-000000000006', 1, 'A+', 'PLATELETS',
   250, now() - INTERVAL '1 day', now() + INTERVAL '4 days', 'RELEASED', 'IN_STOCK',
   'c0000000-0000-0000-0000-000000000003', now() - INTERVAL '12 hours'),

  -- B+ Fresh Frozen Plasma (Valid 365 days)
  ('u4444444-4444-4444-4444-444444444444', 'd0000001-0000-0000-0000-000000000006', 1, 'B+', 'PLASMA',
   300, now() - INTERVAL '10 days', now() + INTERVAL '355 days', 'RELEASED', 'IN_STOCK',
   'c0000000-0000-0000-0000-000000000003', now() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Refresh materialized view after seeding initial donations
REFRESH MATERIALIZED VIEW mv_monthly_donation_counts;

COMMIT;

-- ============================================================================
-- BloodBridge Database Refactoring: Table Creation & Relational Schema
-- File: 001_table_creation.sql
-- Module: Relational DDL (Tables, Constraints, Keys, Indexes, Privileges)
-- Target: PostgreSQL 16+
-- ============================================================================

BEGIN;

-- 1. Administrative Hierarchy: Provinces
CREATE TABLE IF NOT EXISTS provinces (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- 2. Administrative Hierarchy: Districts
CREATE TABLE IF NOT EXISTS districts (
  code TEXT PRIMARY KEY,
  province_code TEXT NOT NULL REFERENCES provinces(code),
  name TEXT NOT NULL,
  UNIQUE (province_code, name)
);

-- 3. Administrative Hierarchy: Divisional Secretariat (DS) Divisions
CREATE TABLE IF NOT EXISTS ds_divisions (
  code TEXT NOT NULL,
  district_code TEXT NOT NULL REFERENCES districts(code),
  name TEXT NOT NULL,
  source_date DATE DEFAULT '2026-01-01',
  PRIMARY KEY (code, district_code),
  UNIQUE (code, district_code),
  UNIQUE (district_code, name)
);

-- 4. Administrative Hierarchy: Grama Niladhari (GN) Divisions (M1 Extension)
CREATE TABLE IF NOT EXISTS gn_divisions (
  code TEXT PRIMARY KEY,
  ds_code TEXT NOT NULL,
  district_code TEXT NOT NULL,
  name TEXT NOT NULL,
  source_date DATE DEFAULT '2026-01-01',
  FOREIGN KEY (ds_code, district_code) REFERENCES ds_divisions(code, district_code),
  UNIQUE (code, ds_code, district_code)
);

-- 5. Physical Locations & Geospatial Coordinates
CREATE TABLE IF NOT EXISTS locations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  district_code TEXT NOT NULL REFERENCES districts(code),
  ds_code TEXT,
  gn_code TEXT,
  town TEXT,
  address_line TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  CONSTRAINT fk_location_ds_same_district FOREIGN KEY (ds_code, district_code)
    REFERENCES ds_divisions(code, district_code),
  CONSTRAINT fk_location_gn_composite FOREIGN KEY (gn_code, ds_code, district_code)
    REFERENCES gn_divisions(code, ds_code, district_code)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT ck_location_coordinate_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CONSTRAINT ck_location_lat CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT ck_location_lon CHECK (longitude BETWEEN -180 AND 180)
);

-- 6. User Accounts & RBAC Identity (Admin, Donor, Hospital Staff, Bank Staff)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN','DONOR','HOSPITAL_STAFF','BANK_STAFF')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (LOWER(email));

-- 7. Healthcare Institutions: Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  location_id BIGINT NOT NULL REFERENCES locations(id),
  contact_phone TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- 8. Regional Clusters: Blood Bank Clusters (Sri Lanka NBTS Regional Hubs)
CREATE TABLE IF NOT EXISTS blood_bank_clusters (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cluster_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  lead_hospital_id BIGINT REFERENCES hospitals(id),
  district_code TEXT NOT NULL REFERENCES districts(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Healthcare Institutions: Blood Banks
CREATE TABLE IF NOT EXISTS blood_banks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  location_id BIGINT NOT NULL REFERENCES locations(id),
  hospital_id BIGINT REFERENCES hospitals(id),
  cluster_id BIGINT REFERENCES blood_bank_clusters(id),
  contact_phone TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- 10. Staff Memberships (Institutional Assignment & Scope Enforcement)
CREATE TABLE IF NOT EXISTS staff_memberships (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  hospital_id BIGINT REFERENCES hospitals(id),
  blood_bank_id BIGINT REFERENCES blood_banks(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK ((hospital_id IS NOT NULL)::int + (blood_bank_id IS NOT NULL)::int = 1),
  UNIQUE (user_id, hospital_id),
  UNIQUE (user_id, blood_bank_id)
);

-- 11. Clinical Master Data: Blood Types (ABO & Rh Groups)
CREATE TABLE IF NOT EXISTS blood_types (
  code TEXT PRIMARY KEY CHECK (code IN ('O-','O+','A-','A+','B-','B+','AB-','AB+'))
);

-- 12. Clinical Master Data: Blood Component Types
CREATE TABLE IF NOT EXISTS component_types (
  code TEXT PRIMARY KEY CHECK(code IN ('RBC','PLASMA','PLATELETS')),
  name TEXT NOT NULL
);

-- 13. Donor Profiles (Supports Online Self-Registration and Walk-in Intake)
CREATE TABLE IF NOT EXISTS donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id), -- Nullable for staff walk-in intake
  full_name TEXT,
  phone TEXT,
  email TEXT,
  registration_origin TEXT NOT NULL DEFAULT 'ONLINE'
    CHECK (registration_origin IN ('ONLINE', 'STAFF_WALKIN', 'CAMP_WALKIN')),
  national_id_hash TEXT,
  enrolled_by UUID REFERENCES users(id),
  enrolled_at_bank_id BIGINT REFERENCES blood_banks(id),
  enrolled_at_camp_id UUID,
  blood_type_code TEXT REFERENCES blood_types(code),
  district_code TEXT NOT NULL REFERENCES districts(code),
  ds_code TEXT,
  gn_code TEXT,
  town TEXT,
  birth_date DATE,
  weight_kg NUMERIC(4,1),
  available_for_contact BOOLEAN NOT NULL DEFAULT FALSE,
  camp_notifications_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_to_donor_id UUID REFERENCES donors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(ds_code, district_code) REFERENCES ds_divisions(code, district_code),
  CONSTRAINT ck_donor_min_age CHECK (birth_date IS NULL OR birth_date <= (CURRENT_DATE - INTERVAL '18 years')),
  CONSTRAINT ck_donor_min_weight CHECK (weight_kg IS NULL OR weight_kg >= 50.0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_donors_national_id_hash
  ON donors(national_id_hash) WHERE national_id_hash IS NOT NULL;

-- 14. Donor Consents (Granular Notification & Contact Preferences)
CREATE TABLE IF NOT EXISTS donor_consents (
  donor_id UUID PRIMARY KEY REFERENCES donors(id) ON DELETE CASCADE,
  contact_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  camp_notification_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  emergency_appeal_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  sms_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  email_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  in_app_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Auditable Donor Consent History Ledger
CREATE TABLE IF NOT EXISTS donor_consent_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  contact_allowed BOOLEAN NOT NULL,
  camp_notification_opt_in BOOLEAN NOT NULL,
  emergency_appeal_opt_in BOOLEAN NOT NULL,
  sms_alerts BOOLEAN DEFAULT FALSE,
  email_alerts BOOLEAN DEFAULT FALSE,
  in_app_alerts BOOLEAN DEFAULT TRUE,
  newsletter_opt_in BOOLEAN DEFAULT FALSE,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Camp Organizers (Community Organizations, Red Cross, Lions Club, etc.)
CREATE TABLE IF NOT EXISTS camp_organizers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- 17. Donation Camps (Mobile Blood Collection Campaigns)
CREATE TABLE IF NOT EXISTS donation_camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  organizer_id BIGINT NOT NULL REFERENCES camp_organizers(id),
  blood_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
  location_id BIGINT NOT NULL REFERENCES locations(id),
  proposed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER CHECK(capacity IS NULL OR capacity > 0),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK(status IN ('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED')),
  public_contact TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK(status <> 'APPROVED' OR approved_by IS NOT NULL)
);

-- 18. Camp Target Geographical Notification Areas
CREATE TABLE IF NOT EXISTS camp_target_areas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  camp_id UUID NOT NULL REFERENCES donation_camps(id) ON DELETE CASCADE,
  district_code TEXT NOT NULL REFERENCES districts(code),
  ds_code TEXT,
  radius_km NUMERIC(5,2) CHECK(radius_km IS NULL OR radius_km BETWEEN 1 AND 100),
  FOREIGN KEY(ds_code, district_code) REFERENCES ds_divisions(code, district_code),
  UNIQUE(camp_id, district_code, ds_code)
);

-- 19. Donor Camp Registrations & Attendance Tracking
CREATE TABLE IF NOT EXISTS camp_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES donation_camps(id),
  donor_id UUID NOT NULL REFERENCES donors(id),
  status TEXT NOT NULL DEFAULT 'REGISTERED'
    CHECK(status IN ('REGISTERED','CANCELLED','ATTENDED','NO_SHOW')),
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES users(id),
  attendance_notes TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(camp_id, donor_id)
);

-- 20. In-Person Donor Visits (Separation of Visit from Collection)
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

-- 21. Clinical Assessments & Medical Screening
CREATE TABLE IF NOT EXISTS donor_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES donor_visits(id),
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

-- 22. Donations (Completed Phlebotomy Collections)
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID UNIQUE REFERENCES donor_visits(id),
  donor_id UUID NOT NULL REFERENCES donors(id),
  blood_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
  camp_id UUID REFERENCES donation_camps(id),
  collected_at TIMESTAMPTZ NOT NULL,
  collected_volume_ml INTEGER CHECK(collected_volume_ml IS NULL OR collected_volume_ml > 0),
  process_status TEXT NOT NULL DEFAULT 'COLLECTED'
    CHECK(process_status IN ('COLLECTED','PROCESSING','PROCESSED','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. Blood Units Inventory (Component Level with Storage & Quarantine Lifecycle)
CREATE TABLE IF NOT EXISTS blood_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES donations(id),
  blood_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
  blood_type_code TEXT NOT NULL REFERENCES blood_types(code),
  component_code TEXT NOT NULL REFERENCES component_types(code),
  volume_ml INT DEFAULT 450,
  collected_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  release_status TEXT NOT NULL DEFAULT 'QUARANTINED'
    CHECK(release_status IN ('QUARANTINED','RELEASED','REJECTED')),
  inventory_status TEXT NOT NULL DEFAULT 'IN_STOCK'
    CHECK(inventory_status IN ('IN_STOCK','RESERVED','IN_TRANSIT','ISSUED','DISCARDED')),
  released_by UUID REFERENCES users(id),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(expires_at > collected_at),
  CHECK(release_status <> 'RELEASED' OR released_by IS NOT NULL),
  CHECK(release_status = 'RELEASED' OR inventory_status NOT IN ('RESERVED','ISSUED'))
);

-- 24. Hospital Blood Requests (Orders from Operating/Emergency Theatres)
CREATE TABLE IF NOT EXISTS blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id BIGINT NOT NULL REFERENCES hospitals(id),
  created_by UUID NOT NULL REFERENCES users(id),
  urgency TEXT NOT NULL CHECK(urgency IN ('ROUTINE','URGENT','CRITICAL')),
  needed_by TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK(status IN ('OPEN','PARTIALLY_FILLED','FULFILLED','CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 25. Blood Request Line Items (Component Breakdown)
CREATE TABLE IF NOT EXISTS request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES blood_requests(id),
  blood_type_code TEXT NOT NULL REFERENCES blood_types(code),
  component_code TEXT NOT NULL REFERENCES component_types(code),
  units_requested INTEGER NOT NULL CHECK(units_requested > 0)
);

-- 26. Potential Donor Matches
CREATE TABLE IF NOT EXISTS donor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_item_id UUID NOT NULL REFERENCES request_items(id),
  donor_id UUID NOT NULL REFERENCES donors(id),
  match_reason TEXT,
  status TEXT NOT NULL DEFAULT 'POTENTIAL'
    CHECK(status IN ('POTENTIAL','INVITED','ACCEPTED','DECLINED','CLOSED')),
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_item_id, donor_id)
);

-- 27. Inventory Reservations (Atomic Unit Allocations to Request Items)
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_item_id UUID NOT NULL REFERENCES request_items(id),
  blood_unit_id UUID NOT NULL REFERENCES blood_units(id),
  reserved_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK(status IN ('ACTIVE','CANCELLED','FULFILLED')),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_blood_unit_active_reservation
  ON inventory_reservations(blood_unit_id) WHERE status='ACTIVE';

-- 28. Hospital Request Fulfillments (Dispatch & Delivery Batches)
CREATE TABLE IF NOT EXISTS fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES blood_requests(id),
  blood_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
  status TEXT NOT NULL DEFAULT 'PREPARING'
    CHECK(status IN ('PREPARING','DISPATCHED','RECEIVED','CANCELLED')),
  received_by UUID REFERENCES users(id),
  received_at TIMESTAMPTZ,
  received_quantity INTEGER CHECK (received_quantity IS NULL OR received_quantity > 0),
  condition_notes TEXT,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 29. Fulfillment Units Join Table
CREATE TABLE IF NOT EXISTS fulfillment_units (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fulfillment_id UUID NOT NULL REFERENCES fulfillments(id),
  reservation_id UUID NOT NULL UNIQUE REFERENCES inventory_reservations(id),
  blood_unit_id UUID NOT NULL UNIQUE REFERENCES blood_units(id)
);

-- 30. Inter-Bank Blood Transfers (Cold Chain Redistribution)
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

-- 31. Units Attached to Inter-Bank Transfers
CREATE TABLE IF NOT EXISTS transfer_units (
  transfer_id UUID NOT NULL REFERENCES blood_bank_transfers(id) ON DELETE CASCADE,
  blood_unit_id UUID NOT NULL REFERENCES blood_units(id),
  PRIMARY KEY (transfer_id, blood_unit_id)
);

-- 32. Inventory Movements Audit Trail
CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  blood_unit_id UUID NOT NULL REFERENCES blood_units(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  action TEXT NOT NULL,
  acted_by UUID REFERENCES users(id),
  acted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 33. Emergency Appeals (Hospital Acute Shortage Escalations)
CREATE TABLE IF NOT EXISTS emergency_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  request_item_id UUID NOT NULL REFERENCES request_items(id) ON DELETE CASCADE,
  hospital_id BIGINT NOT NULL REFERENCES hospitals(id),
  created_by UUID NOT NULL REFERENCES users(id),
  shortage_units INTEGER NOT NULL CHECK (shortage_units > 0),
  reason TEXT NOT NULL,
  scope_code TEXT,
  escalation_level TEXT NOT NULL DEFAULT 'GN_DIVISION'
    CHECK (escalation_level IN ('GN_DIVISION', 'DS_DIVISION', 'DISTRICT', 'PROVINCE', 'NATIONAL')),
  status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED')),
  target_blood_type TEXT NOT NULL REFERENCES blood_types(code),
  target_component_code TEXT NOT NULL REFERENCES component_types(code),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 34. Appeal Escalation Steps (Tracking Regional Broadcast Waves)
CREATE TABLE IF NOT EXISTS appeal_escalation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id UUID NOT NULL REFERENCES emergency_appeals(id) ON DELETE CASCADE,
  stage_order INT NOT NULL,
  stage_name TEXT NOT NULL
    CHECK (stage_name IN ('GN_DIVISION', 'DS_DIVISION', 'DISTRICT', 'PROVINCE', 'NATIONAL')),
  geo_code TEXT,
  candidates_identified INT NOT NULL DEFAULT 0,
  invitations_sent INT NOT NULL DEFAULT 0,
  responses_interested INT NOT NULL DEFAULT 0,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appeal_id, stage_order)
);

-- 35. Blood Request Status Transition Audit History
CREATE TABLE IF NOT EXISTS request_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 36. Donor Appointments (Scheduled Bank or Camp Donations)
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_donor_active_appointment_date
  ON donor_appointments (donor_id, appointment_date, COALESCE(blood_bank_id, 0), COALESCE(camp_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status IN ('BOOKED', 'CONFIRMED');

-- 37. Targeted Donor Invitations (Direct Regional Appeals)
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

-- 38. Donor Account Link Claims (Online User Linking to Walk-in Record)
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_donor_active_claim
  ON donor_account_claims(donor_id) WHERE status = 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_active_claim
  ON donor_account_claims(user_id) WHERE status = 'PENDING';

-- 39. Media Assets Table (Camp Flyers, Badges, Posters)
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

-- 40. Camp Media Attachments Join Table
CREATE TABLE IF NOT EXISTS camp_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES donation_camps(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 1,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (camp_id, media_id)
);

-- 41. In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id),
  camp_id UUID REFERENCES donation_camps(id),
  request_id UUID REFERENCES blood_requests(id),
  title TEXT,
  message TEXT NOT NULL,
  channel TEXT DEFAULT 'IN_APP',
  priority TEXT DEFAULT 'ROUTINE',
  category TEXT DEFAULT 'CAMP',
  status TEXT NOT NULL DEFAULT 'UNREAD' CHECK(status IN ('UNREAD','READ')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 42. Multi-Channel Notification Deliveries Ledger
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  recipient_user_id UUID REFERENCES users(id),
  channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS')),
  destination TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'DELIVERED', 'FAILED')),
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

-- 43. Authentication Sessions & Refresh Tokens
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

-- 44. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

-- 45. Email Verification Tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

-- 46. Staff Invitations (Admin Provisioned Memberships)
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('HOSPITAL_STAFF', 'BANK_STAFF')),
  hospital_id BIGINT REFERENCES hospitals(id),
  blood_bank_id BIGINT REFERENCES blood_banks(id),
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((hospital_id IS NOT NULL)::int + (blood_bank_id IS NOT NULL)::int = 1),
  CHECK (expires_at > created_at)
);

-- 47. Transactional Event Outbox (Reliable Async Notifications & Realtime Socket.IO)
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- 48. Quality Incidents & Adverse Events (Haemovigilance)
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

-- 49. Operational Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id UUID REFERENCES users(id),
  entity_name TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- OPERATIONAL INDEXES (Performance, Composite Filtering, B-Tree Optimization)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_donors_available_geo
  ON donors(blood_type_code, district_code, ds_code)
  WHERE available_for_contact = TRUE;

CREATE INDEX IF NOT EXISTS idx_donations_donor_time
  ON donations(donor_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_donations_bank_time
  ON donations(blood_bank_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_hospital_status
  ON blood_requests(hospital_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blood_requests_hospital_urgency_date
  ON blood_requests(hospital_id, urgency, needed_by)
  WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

CREATE INDEX IF NOT EXISTS idx_request_items_type
  ON request_items(blood_type_code, component_code);

CREATE INDEX IF NOT EXISTS idx_units_available
  ON blood_units(blood_bank_id, blood_type_code, component_code, expires_at)
  WHERE release_status='RELEASED' AND inventory_status='IN_STOCK';

CREATE INDEX IF NOT EXISTS idx_blood_units_bank_status_exp
  ON blood_units(blood_bank_id, release_status, inventory_status, expires_at);

CREATE INDEX IF NOT EXISTS idx_camps_public_time
  ON donation_camps(starts_at)
  WHERE status='APPROVED';

CREATE INDEX IF NOT EXISTS idx_camps_target_area
  ON camp_target_areas(district_code, ds_code);

CREATE INDEX IF NOT EXISTS idx_donation_camps_staff_lookup
  ON donation_camps(blood_bank_id, status, starts_at);

CREATE INDEX IF NOT EXISTS idx_camp_registrations_donor_lookup
  ON camp_registrations(donor_id, status);

CREATE INDEX IF NOT EXISTS idx_camp_registrations_camp_status
  ON camp_registrations(camp_id, status);

CREATE INDEX IF NOT EXISTS idx_donor_visits_donor
  ON donor_visits(donor_id, visit_date DESC);

CREATE INDEX IF NOT EXISTS idx_donor_assessments_lookup
  ON donor_assessments(donor_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfers_status
  ON blood_bank_transfers(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movement_unit
  ON inventory_movements(blood_unit_id, acted_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_time
  ON inventory_movements(acted_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_appeals_hospital
  ON emergency_appeals(hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_appeals_status
  ON emergency_appeals(status, created_at DESC)
  WHERE status IN ('PENDING_APPROVAL', 'APPROVED', 'ACTIVE');

CREATE INDEX IF NOT EXISTS idx_appeal_escalation_steps_appeal
  ON appeal_escalation_steps(appeal_id, stage_order ASC);

CREATE INDEX IF NOT EXISTS idx_request_status_history_request
  ON request_status_history(request_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_donor_appointments_donor
  ON donor_appointments(donor_id, appointment_date DESC);

CREATE INDEX IF NOT EXISTS idx_donor_appointments_bank_date
  ON donor_appointments(blood_bank_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_donor_appointments_slot_capacity
  ON donor_appointments (appointment_date, time_slot, blood_bank_id, camp_id)
  WHERE status IN ('BOOKED', 'CONFIRMED');

CREATE INDEX IF NOT EXISTS idx_donor_invitations_donor
  ON donor_invitations(donor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donor_invitations_active
  ON donor_invitations(donor_id, expires_at DESC)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_donor_claims_status
  ON donor_account_claims(status, claimed_at DESC);

CREATE INDEX IF NOT EXISTS idx_camp_media_camp
  ON camp_media(camp_id, is_primary);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications(recipient_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON notification_deliveries(status, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recipient
  ON notification_deliveries(recipient_user_id, channel);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON auth_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_active
  ON auth_sessions(token_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active
  ON password_reset_tokens(token_hash)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user
  ON email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email
  ON staff_invitations(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_staff_invitations_pending
  ON staff_invitations(token_hash)
  WHERE accepted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON event_outbox(created_at)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_outbox_processing_stale
  ON event_outbox(updated_at)
  WHERE status = 'PROCESSING';

CREATE INDEX IF NOT EXISTS idx_locations_composite_geo
  ON locations(district_code, ds_code, gn_code);

-- ============================================================================
-- RUNTIME PRIVILEGES (Least-Privilege Hardening)
-- ============================================================================

GRANT USAGE, CREATE ON SCHEMA public TO CURRENT_USER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO CURRENT_USER;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO CURRENT_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON ROUTINES TO CURRENT_USER;

COMMENT ON SCHEMA public IS 'BloodBridge OLTP schema with complete relational DDL and runtime permissions';

COMMIT;

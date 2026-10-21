-- BloodBridge academic prototype | PostgreSQL 16+ | migration 001
-- Run in an empty database. NEVER use real donor/patient information in demo seeds.
BEGIN;

CREATE TABLE provinces (
 code TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE
);
CREATE TABLE districts (
 code TEXT PRIMARY KEY, province_code TEXT NOT NULL REFERENCES provinces(code), name TEXT NOT NULL,
 UNIQUE(province_code,name)
);
CREATE TABLE ds_divisions (
 code TEXT PRIMARY KEY, district_code TEXT NOT NULL REFERENCES districts(code), name TEXT NOT NULL,
 UNIQUE(code,district_code), UNIQUE(district_code,name)
);
-- GN divisions are a phase-2 extension; do not invent the national dataset.
CREATE TABLE locations (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 district_code TEXT NOT NULL REFERENCES districts(code),
 ds_code TEXT,
 town TEXT NOT NULL, address_line TEXT,
 latitude NUMERIC(9,6), longitude NUMERIC(9,6),
 CONSTRAINT fk_location_ds_same_district FOREIGN KEY (ds_code,district_code)
   REFERENCES ds_divisions(code,district_code),
 CONSTRAINT ck_location_coordinate_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
 CONSTRAINT ck_location_lat CHECK (latitude BETWEEN -90 AND 90),
 CONSTRAINT ck_location_lon CHECK (longitude BETWEEN -180 AND 180)
);
CREATE TABLE users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE, phone TEXT,
 password_hash TEXT NOT NULL, role TEXT NOT NULL
 CHECK(role IN ('ADMIN','DONOR','HOSPITAL_STAFF','BANK_STAFF')),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE hospitals (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name TEXT NOT NULL, location_id BIGINT NOT NULL REFERENCES locations(id),
 contact_phone TEXT, is_verified BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE blood_banks (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name TEXT NOT NULL, location_id BIGINT NOT NULL REFERENCES locations(id),
 hospital_id BIGINT REFERENCES hospitals(id), contact_phone TEXT,
 is_verified BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE staff_memberships (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id),
 hospital_id BIGINT REFERENCES hospitals(id), blood_bank_id BIGINT REFERENCES blood_banks(id),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 CHECK ((hospital_id IS NOT NULL)::int + (blood_bank_id IS NOT NULL)::int = 1),
 UNIQUE(user_id,hospital_id), UNIQUE(user_id,blood_bank_id)
);
CREATE TABLE blood_types (
 code TEXT PRIMARY KEY CHECK (code IN ('O-','O+','A-','A+','B-','B+','AB-','AB+'))
);
CREATE TABLE component_types (
 code TEXT PRIMARY KEY CHECK(code IN ('RBC','PLASMA','PLATELETS')),
 name TEXT NOT NULL
);
CREATE TABLE donors (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL UNIQUE REFERENCES users(id),
 blood_type_code TEXT REFERENCES blood_types(code), -- optionally unknown until verified
 district_code TEXT NOT NULL REFERENCES districts(code),
 ds_code TEXT,
 available_for_contact BOOLEAN NOT NULL DEFAULT FALSE,
 camp_notifications_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(ds_code,district_code) REFERENCES ds_divisions(code,district_code)
);
CREATE TABLE camp_organizers (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name TEXT NOT NULL, email TEXT, phone TEXT, is_verified BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE donation_camps (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 title TEXT NOT NULL, organizer_id BIGINT NOT NULL REFERENCES camp_organizers(id),
 blood_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
 location_id BIGINT NOT NULL REFERENCES locations(id),
 proposed_by UUID REFERENCES users(id), approved_by UUID REFERENCES users(id),
 starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
 capacity INTEGER CHECK(capacity IS NULL OR capacity > 0),
 status TEXT NOT NULL DEFAULT 'DRAFT'
   CHECK(status IN ('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED')),
 public_contact TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (ends_at > starts_at),
 CHECK(status <> 'APPROVED' OR approved_by IS NOT NULL)
);
CREATE TABLE camp_target_areas (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 camp_id UUID NOT NULL REFERENCES donation_camps(id) ON DELETE CASCADE,
 district_code TEXT NOT NULL REFERENCES districts(code), ds_code TEXT,
 radius_km NUMERIC(5,2) CHECK(radius_km IS NULL OR radius_km BETWEEN 1 AND 100),
 FOREIGN KEY(ds_code,district_code) REFERENCES ds_divisions(code,district_code),
 UNIQUE(camp_id,district_code,ds_code)
);
CREATE TABLE camp_registrations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 camp_id UUID NOT NULL REFERENCES donation_camps(id),
 donor_id UUID NOT NULL REFERENCES donors(id),
 status TEXT NOT NULL DEFAULT 'REGISTERED'
   CHECK(status IN ('REGISTERED','CANCELLED','ATTENDED','NO_SHOW')),
 registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(camp_id,donor_id)
);
CREATE TABLE donations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 donor_id UUID NOT NULL REFERENCES donors(id),
 blood_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
 camp_id UUID REFERENCES donation_camps(id),
 collected_at TIMESTAMPTZ NOT NULL,
 collected_volume_ml INTEGER CHECK(collected_volume_ml IS NULL OR collected_volume_ml > 0),
 process_status TEXT NOT NULL DEFAULT 'COLLECTED'
   CHECK(process_status IN ('COLLECTED','PROCESSING','PROCESSED','REJECTED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE blood_units (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 donation_id UUID NOT NULL REFERENCES donations(id),
 blood_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
 blood_type_code TEXT NOT NULL REFERENCES blood_types(code),
 component_code TEXT NOT NULL REFERENCES component_types(code),
 collected_at TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 release_status TEXT NOT NULL DEFAULT 'QUARANTINED'
   CHECK(release_status IN ('QUARANTINED','RELEASED','REJECTED')),
 inventory_status TEXT NOT NULL DEFAULT 'IN_STOCK'
   CHECK(inventory_status IN ('IN_STOCK','RESERVED','ISSUED','DISCARDED')),
 released_by UUID REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(expires_at > collected_at),
 CHECK(release_status <> 'RELEASED' OR released_by IS NOT NULL),
 CHECK(release_status = 'RELEASED' OR inventory_status NOT IN ('RESERVED','ISSUED'))
);
CREATE TABLE blood_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 hospital_id BIGINT NOT NULL REFERENCES hospitals(id),
 created_by UUID NOT NULL REFERENCES users(id),
 urgency TEXT NOT NULL CHECK(urgency IN ('ROUTINE','URGENT','CRITICAL')),
 needed_by TIMESTAMPTZ NOT NULL,
 status TEXT NOT NULL DEFAULT 'OPEN'
   CHECK(status IN ('OPEN','PARTIALLY_FILLED','FULFILLED','CANCELLED')),
 notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE request_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id UUID NOT NULL REFERENCES blood_requests(id),
 blood_type_code TEXT NOT NULL REFERENCES blood_types(code),
 component_code TEXT NOT NULL REFERENCES component_types(code),
 units_requested INTEGER NOT NULL CHECK(units_requested > 0)
);
CREATE TABLE donor_matches (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 request_item_id UUID NOT NULL REFERENCES request_items(id),
 donor_id UUID NOT NULL REFERENCES donors(id),
 match_reason TEXT, status TEXT NOT NULL DEFAULT 'POTENTIAL'
   CHECK(status IN ('POTENTIAL','INVITED','ACCEPTED','DECLINED','CLOSED')),
 matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(request_item_id,donor_id)
);
CREATE TABLE inventory_reservations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 request_item_id UUID NOT NULL REFERENCES request_items(id),
 blood_unit_id UUID NOT NULL REFERENCES blood_units(id),
 reserved_by UUID NOT NULL REFERENCES users(id),
 status TEXT NOT NULL DEFAULT 'ACTIVE'
   CHECK(status IN ('ACTIVE','CANCELLED','FULFILLED')),
 reserved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_blood_unit_active_reservation
 ON inventory_reservations(blood_unit_id) WHERE status='ACTIVE';
CREATE TABLE fulfillments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id UUID NOT NULL REFERENCES blood_requests(id),
 blood_bank_id BIGINT NOT NULL REFERENCES blood_banks(id),
 status TEXT NOT NULL DEFAULT 'PREPARING'
   CHECK(status IN ('PREPARING','DISPATCHED','RECEIVED','CANCELLED')),
 fulfilled_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE fulfillment_units (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 fulfillment_id UUID NOT NULL REFERENCES fulfillments(id),
 reservation_id UUID NOT NULL UNIQUE REFERENCES inventory_reservations(id),
 blood_unit_id UUID NOT NULL UNIQUE REFERENCES blood_units(id)
);
CREATE TABLE inventory_movements (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 blood_unit_id UUID NOT NULL REFERENCES blood_units(id),
 from_status TEXT, to_status TEXT NOT NULL,
 action TEXT NOT NULL, acted_by UUID REFERENCES users(id),
 acted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE notifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 recipient_user_id UUID NOT NULL REFERENCES users(id),
 camp_id UUID REFERENCES donation_camps(id),
 request_id UUID REFERENCES blood_requests(id),
 message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'UNREAD'
   CHECK(status IN ('UNREAD','READ')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE audit_logs (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id UUID REFERENCES users(id), entity_name TEXT NOT NULL,
 entity_id TEXT NOT NULL, action TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
 -- Do not log sensitive clinical/personal payloads in this table.
);

-- Operational indexes; EXPLAIN ANALYZE comparisons use the separate benchmark script.
CREATE INDEX idx_donors_available_geo ON donors(blood_type_code,district_code,ds_code)
 WHERE available_for_contact = TRUE;
CREATE INDEX idx_donations_donor_time ON donations(donor_id,collected_at DESC);
CREATE INDEX idx_requests_hospital_status ON blood_requests(hospital_id,status,created_at DESC);
CREATE INDEX idx_request_items_type ON request_items(blood_type_code,component_code);
CREATE INDEX idx_units_available ON blood_units(blood_bank_id,blood_type_code,component_code,expires_at)
 WHERE release_status='RELEASED' AND inventory_status='IN_STOCK';
CREATE INDEX idx_camps_public_time ON donation_camps(starts_at)
 WHERE status='APPROVED';
CREATE INDEX idx_camps_target_area ON camp_target_areas(district_code,ds_code);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id,created_at DESC);
CREATE INDEX idx_inventory_movement_unit ON inventory_movements(blood_unit_id,acted_at DESC);
COMMIT;

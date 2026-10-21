-- Run in a separate PostgreSQL database, e.g. bloodbridge_warehouse.
-- The ETL process transfers sanitized/aggregated data from OLTP; never include names/email/phone.
BEGIN;
CREATE TABLE dim_date(date_key INTEGER PRIMARY KEY, full_date DATE NOT NULL UNIQUE, year SMALLINT NOT NULL, month SMALLINT NOT NULL, quarter SMALLINT NOT NULL);
CREATE TABLE dim_district(district_key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, district_code TEXT NOT NULL UNIQUE, district_name TEXT NOT NULL, province_name TEXT NOT NULL);
CREATE TABLE dim_blood_type(type_key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, blood_type_code TEXT NOT NULL UNIQUE);
CREATE TABLE dim_component(component_key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, component_code TEXT NOT NULL UNIQUE);
CREATE TABLE fact_donations(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, source_donation_id UUID NOT NULL UNIQUE, date_key INTEGER NOT NULL REFERENCES dim_date(date_key), district_key BIGINT NOT NULL REFERENCES dim_district(district_key), donation_count INTEGER NOT NULL DEFAULT 1);
CREATE TABLE fact_request_items(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, source_request_item_id UUID NOT NULL UNIQUE, date_key INTEGER NOT NULL REFERENCES dim_date(date_key), district_key BIGINT NOT NULL REFERENCES dim_district(district_key), type_key BIGINT NOT NULL REFERENCES dim_blood_type(type_key), component_key BIGINT NOT NULL REFERENCES dim_component(component_key), requested_units INTEGER NOT NULL, fulfilled_units INTEGER NOT NULL DEFAULT 0);
CREATE TABLE fact_camp_registrations(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, source_registration_id UUID NOT NULL UNIQUE, date_key INTEGER NOT NULL REFERENCES dim_date(date_key), district_key BIGINT NOT NULL REFERENCES dim_district(district_key), registered_count INTEGER NOT NULL DEFAULT 1, attended_count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE etl_runs(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ, status TEXT NOT NULL, rows_loaded INTEGER NOT NULL DEFAULT 0);
COMMIT;

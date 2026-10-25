-- BloodBridge Warehouse Analytics Extension | PostgreSQL 16+ | migration 005
-- Analytical star schema extension: stock snapshots, transfers, institutions, ETL audit, and materialized reporting.

BEGIN;

-- 1. Dimension: Institutions (Hospitals and Blood Banks)
CREATE TABLE IF NOT EXISTS dim_institution (
  institution_key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_institution_id BIGINT NOT NULL,
  institution_type TEXT NOT NULL CHECK (institution_type IN ('HOSPITAL', 'BLOOD_BANK')),
  institution_name TEXT NOT NULL,
  district_key BIGINT REFERENCES dim_district(district_key),
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (source_institution_id, institution_type)
);

-- 2. Enhance ETL Runs table with auditing metadata
ALTER TABLE etl_runs ADD COLUMN IF NOT EXISTS job_name TEXT NOT NULL DEFAULT 'DAILY_OLAP_ETL';
ALTER TABLE etl_runs ADD COLUMN IF NOT EXISTS load_mode TEXT NOT NULL DEFAULT 'INCREMENTAL' CHECK (load_mode IN ('FULL', 'INCREMENTAL'));
ALTER TABLE etl_runs ADD COLUMN IF NOT EXISTS requested_by TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE etl_runs ADD COLUMN IF NOT EXISTS error_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE etl_runs ADD COLUMN IF NOT EXISTS watermark_timestamp TIMESTAMPTZ;
ALTER TABLE etl_runs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- 3. ETL Run Error Logging Table
CREATE TABLE IF NOT EXISTS etl_run_errors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id BIGINT REFERENCES etl_runs(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id TEXT,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Fact: Daily Component Inventory Snapshot
-- Grain: One record per blood bank, per blood type, per component, per calendar day
CREATE TABLE IF NOT EXISTS fact_inventory_snapshot (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
  institution_key BIGINT NOT NULL REFERENCES dim_institution(institution_key),
  type_key BIGINT NOT NULL REFERENCES dim_blood_type(type_key),
  component_key BIGINT NOT NULL REFERENCES dim_component(component_key),
  available_units INTEGER NOT NULL DEFAULT 0 CHECK (available_units >= 0),
  quarantined_units INTEGER NOT NULL DEFAULT 0 CHECK (quarantined_units >= 0),
  reserved_units INTEGER NOT NULL DEFAULT 0 CHECK (reserved_units >= 0),
  expiring_7d_units INTEGER NOT NULL DEFAULT 0 CHECK (expiring_7d_units >= 0),
  expired_units INTEGER NOT NULL DEFAULT 0 CHECK (expired_units >= 0),
  total_units INTEGER GENERATED ALWAYS AS (available_units + quarantined_units + reserved_units) STORED,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date_key, institution_key, type_key, component_key)
);

-- 5. Fact: Inter-Bank Blood Transfers
-- Grain: One record per transfer event
CREATE TABLE IF NOT EXISTS fact_transfers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_transfer_id UUID NOT NULL UNIQUE,
  date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
  source_bank_key BIGINT NOT NULL REFERENCES dim_institution(institution_key),
  target_bank_key BIGINT NOT NULL REFERENCES dim_institution(institution_key),
  type_key BIGINT REFERENCES dim_blood_type(type_key),
  component_key BIGINT REFERENCES dim_component(component_key),
  units_transferred INTEGER NOT NULL DEFAULT 1 CHECK (units_transferred > 0),
  status TEXT NOT NULL,
  transit_duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Add institution & urgency attributes to fact_request_items if missing
ALTER TABLE fact_request_items ADD COLUMN IF NOT EXISTS institution_key BIGINT REFERENCES dim_institution(institution_key);
ALTER TABLE fact_request_items ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'ROUTINE';

-- 7. Add institution & blood type attributes to fact_donations if missing
ALTER TABLE fact_donations ADD COLUMN IF NOT EXISTS institution_key BIGINT REFERENCES dim_institution(institution_key);
ALTER TABLE fact_donations ADD COLUMN IF NOT EXISTS type_key BIGINT REFERENCES dim_blood_type(type_key);

-- 8. Dimensional and Fact Indexes for High-Performance Analytical Queries
CREATE INDEX IF NOT EXISTS idx_fact_donations_date_dist ON fact_donations(date_key, district_key);
CREATE INDEX IF NOT EXISTS idx_fact_requests_date_type ON fact_request_items(date_key, type_key, component_key);
CREATE INDEX IF NOT EXISTS idx_fact_requests_inst ON fact_request_items(institution_key);
CREATE INDEX IF NOT EXISTS idx_fact_inventory_snapshot_lookup ON fact_inventory_snapshot(institution_key, date_key);
CREATE INDEX IF NOT EXISTS idx_fact_transfers_banks ON fact_transfers(source_bank_key, target_bank_key, date_key);

-- 9. Analytical OLAP Views
-- A. Monthly Donation Totals with Window Functions (LAG for MoM growth, Running Cumulative Total)
CREATE OR REPLACE VIEW v_monthly_donation_totals AS
WITH monthly_agg AS (
  SELECT d.year,
         d.month,
         di.district_code,
         di.district_name,
         sum(fd.donation_count)::bigint AS total_donations
  FROM fact_donations fd
  JOIN dim_date d ON d.date_key = fd.date_key
  JOIN dim_district di ON di.district_key = fd.district_key
  GROUP BY d.year, d.month, di.district_code, di.district_name
)
SELECT year,
       month,
       district_code,
       district_name,
       total_donations,
       lag(total_donations) OVER (PARTITION BY district_code ORDER BY year, month) AS prev_month_donations,
       round(
         CASE 
           WHEN lag(total_donations) OVER (PARTITION BY district_code ORDER BY year, month) IS NULL OR lag(total_donations) OVER (PARTITION BY district_code ORDER BY year, month) = 0 
           THEN 0
           ELSE ((total_donations - lag(total_donations) OVER (PARTITION BY district_code ORDER BY year, month))::numeric / 
                 lag(total_donations) OVER (PARTITION BY district_code ORDER BY year, month) * 100)
         END, 1
       ) AS mom_growth_pct,
       sum(total_donations) OVER (PARTITION BY district_code, year ORDER BY month) AS ytd_cumulative_donations
FROM monthly_agg;

-- B. Blood Demand and Fulfillment by District and Blood Group
CREATE OR REPLACE VIEW v_blood_demand_by_district_group AS
SELECT d.year,
       d.month,
       di.district_code,
       di.district_name,
       bt.blood_type_code,
       ct.component_code,
       sum(fri.requested_units)::bigint AS total_requested,
       sum(fri.fulfilled_units)::bigint AS total_fulfilled,
       round(
         sum(fri.fulfilled_units)::numeric / nullif(sum(fri.requested_units), 0) * 100, 1
       ) AS fill_rate_pct
FROM fact_request_items fri
JOIN dim_date d ON d.date_key = fri.date_key
JOIN dim_district di ON di.district_key = fri.district_key
JOIN dim_blood_type bt ON bt.type_key = fri.type_key
JOIN dim_component ct ON ct.component_key = fri.component_key
GROUP BY d.year, d.month, di.district_code, di.district_name, bt.blood_type_code, ct.component_code;

-- C. Component Stock Trends
CREATE OR REPLACE VIEW v_component_stock_trends AS
SELECT d.full_date AS snapshot_date,
       d.year,
       d.month,
       inst.institution_name AS blood_bank_name,
       bt.blood_type_code,
       ct.component_code,
       fis.available_units,
       fis.quarantined_units,
       fis.reserved_units,
       fis.expiring_7d_units,
       fis.expired_units,
       fis.total_units
FROM fact_inventory_snapshot fis
JOIN dim_date d ON d.date_key = fis.date_key
JOIN dim_institution inst ON inst.institution_key = fis.institution_key
JOIN dim_blood_type bt ON bt.type_key = fis.type_key
JOIN dim_component ct ON ct.component_key = fis.component_key;

-- D. Hospital Fulfillment Performance (CTE and Filtered Aggregates)
CREATE OR REPLACE VIEW v_hospital_fulfillment_performance AS
SELECT inst.institution_name AS hospital_name,
       di.district_name,
       count(fri.id)::bigint AS total_request_items,
       sum(fri.requested_units)::bigint AS total_requested_units,
       sum(fri.fulfilled_units)::bigint AS total_fulfilled_units,
       count(fri.id) FILTER (WHERE fri.fulfilled_units >= fri.requested_units)::bigint AS fully_fulfilled_items,
       count(fri.id) FILTER (WHERE fri.fulfilled_units = 0)::bigint AS unfulfilled_items,
       round(
         sum(fri.fulfilled_units)::numeric / nullif(sum(fri.requested_units), 0) * 100, 1
       ) AS fulfillment_rate_pct
FROM fact_request_items fri
JOIN dim_institution inst ON inst.institution_key = fri.institution_key
JOIN dim_district di ON di.district_key = fri.district_key
GROUP BY inst.institution_name, di.district_name;

-- E. Camp Registrations & Attendance Turnout Performance
CREATE OR REPLACE VIEW v_camp_registrations_summary AS
SELECT d.year,
       d.month,
       di.district_code,
       di.district_name,
       sum(fcr.registered_count)::bigint AS total_registered,
       sum(fcr.attended_count)::bigint AS total_attended,
       round(
         sum(fcr.attended_count)::numeric / nullif(sum(fcr.registered_count), 0) * 100, 1
       ) AS attendance_turnout_pct
FROM fact_camp_registrations fcr
JOIN dim_date d ON d.date_key = fcr.date_key
JOIN dim_district di ON di.district_key = fcr.district_key
GROUP BY d.year, d.month, di.district_code, di.district_name;

-- F. Inter-Bank Transfers Summary
CREATE OR REPLACE VIEW v_transfer_movements_summary AS
SELECT sb.institution_name AS sending_bank,
       tb.institution_name AS receiving_bank,
       bt.blood_type_code,
       ct.component_code,
       ft.status,
       count(*)::bigint AS transfer_count,
       sum(ft.units_transferred)::bigint AS total_units_transferred,
       round(avg(ft.transit_duration_minutes), 1) AS avg_transit_minutes
FROM fact_transfers ft
JOIN dim_institution sb ON sb.institution_key = ft.source_bank_key
JOIN dim_institution tb ON tb.institution_key = ft.target_bank_key
LEFT JOIN dim_blood_type bt ON bt.type_key = ft.type_key
LEFT JOIN dim_component ct ON ct.component_key = ft.component_key
GROUP BY sb.institution_name, tb.institution_name, bt.blood_type_code, ct.component_code, ft.status;

-- 10. Materialized View: Pre-Aggregated Demand Star Matrix
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_warehouse_demand_aggregates AS
SELECT d.year,
       d.month,
       di.district_code,
       bt.blood_type_code,
       ct.component_code,
       fri.urgency,
       sum(fri.requested_units)::bigint AS total_requested,
       sum(fri.fulfilled_units)::bigint AS total_fulfilled,
       count(DISTINCT fri.source_request_item_id)::bigint AS item_count
FROM fact_request_items fri
JOIN dim_date d ON d.date_key = fri.date_key
JOIN dim_district di ON di.district_key = fri.district_key
JOIN dim_blood_type bt ON bt.type_key = fri.type_key
JOIN dim_component ct ON ct.component_key = fri.component_key
GROUP BY d.year, d.month, di.district_code, bt.blood_type_code, ct.component_code, fri.urgency
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_warehouse_demand
  ON mv_warehouse_demand_aggregates(year, month, district_code, blood_type_code, component_code, urgency);

COMMIT;

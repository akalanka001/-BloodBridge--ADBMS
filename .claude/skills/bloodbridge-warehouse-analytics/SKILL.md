---
name: bloodbridge-warehouse-analytics
description: Use for BloodBridge Data Warehouse schema, OLTP-to-OLAP ETL, star schema, demand/inventory/donation facts, SQL aggregates and analytics dashboards.
---

# Data warehouse and analytics

## First read
`database/warehouse/004_warehouse.sql`, `database/migrations/007_advanced_objects.sql` materialized view, `docs/ARCHITECTURE.md`, `README.md` limitations.

## Architecture
- Operational DB `bloodbridge` (OLTP) stays authoritative for reservations, live stock, donor activity and camp registration.
- Separate Postgres database `bloodbridge_warehouse` contains historical dimensions and facts. Data enters through a documented ETL script/job only, **never direct React writes**.
- Facts need explicit grain. Useful dimensions: date, location/district, blood type, component and institution. Facts: donation, request line/fulfillment, inventory snapshot, camp attendance (if actual attendance captured).

## Workflow
1. Inspect existing warehouse DDL; document each dimension, source-to-target mapping, grain and surrogate key strategy.
2. Extract only necessary records via read-only connection and parameterized queries; transform timestamps consistently and preserve historical facts.
3. Idempotent ETL: rerunning the same load must not double-count; add job run metadata, row counts, errors and last refresh time.
4. Generate only synthetic/aggregate data; do not send donor names, phone, email, exact home locations or patient data into warehouse.
5. Create SQL queries for demand by district/month, stock expiry trends and request fill rate. Use the materialized view `mv_monthly_donation_counts` as an operational reporting comparison, NOT as a replacement for warehouse ETL.
6. Show last data refresh and 'sample/benchmark' labels in dashboard. Do not display made-up performance wins.
7. Validate reconciliation of counts between operational source, ETL audit and final fact measures.

## Acceptance
ETL can run twice with identical result counts; source-to-target lineage documented; example OLAP SQL works; warehouse and operations clearly separated; dashboard states staleness/refresh.

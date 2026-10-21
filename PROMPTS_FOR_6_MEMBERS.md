# Six separate AI implementation prompts — one feature branch each

> Start every agent/session by reading root `AGENTS.md`, the matching SKILL.md files and `docs/API_IMPLEMENTED.md`. These prompts are intended for separate members, not simultaneous edits of shared SQL migrations without review.

## Member 1 — Database lead and ADBMS evidence
```text
Use bloodbridge-database-design, bloodbridge-advanced-postgres and bloodbridge-testing. Review the current 001_schema.sql, 007_advanced_objects.sql, verification and benchmark files. Create a concept-to-SQL evidence matrix for views/functions/stored procedures/triggers/ACID/locking/indexes/joins/CTEs/window queries/materialized views/warehouse. Identify verified vs unverified objects. Add only safe incremental migration(s) where needed, align ERD, produce actual PostgreSQL test queries and measured EXPLAIN evidence on synthetic datasets. Do not overwrite baseline migrations; no fabricated timing claims. Deliver evidence and instructions for the other five members. Work in feature/m1-database.
```

## Member 2 — Donor + authentication + geography
```text
Use bloodbridge-express-api, bloodbridge-geography-camps, bloodbridge-responsive-ui and bloodbridge-testing. Inspect existing auth, donor, location routes before building anything. Complete accessible donor profile, willingness, opt-in camp preferences and cascade Province->District->DS selectors, using existing SQL data. Never represent potential eligibility as medical clearance; no unnecessary exact home location exposure. Update API_IMPLEMENTED, OpenAPI and browser/role tests. Work in feature/m2-donors.
```

## Member 3 — Hospital requests + potential matching
```text
Use bloodbridge-express-api, bloodbridge-database-design, bloodbridge-responsive-ui and bloodbridge-testing. Inspect existing requests route and request_items schema. Build the hospital request screen with multi-component items, urgency, date/time, request list/status and authorized organization scoping. Extend API as needed via approved migrations and document it. Implement candidate matching only as potential recruitment, not clinical compatibility. Add validation and cross-hospital permission tests. Work in feature/m3-hospitals.
```

## Member 4 — Blood bank unit inventory and reservation/fulfillment
```text
Use bloodbridge-inventory-transactions, bloodbridge-express-api, bloodbridge-advanced-postgres and bloodbridge-testing. Inspect fn_reserve_blood_unit, stock view, inventory route and DB client transaction helper first. Connect bank dashboard to stock data, implement missing lifecycle transitions in safe backend transactions, and test concurrent reservation, wrong-bank, wrong-status, expired-unit and rollback behavior. Reuse DB audit trigger and never add a second JS reservation algorithm. Use only fabricated demo units. Work in feature/m4-inventory.
```

## Member 5 — Donation camp discovery and area targeting
```text
Use bloodbridge-geography-camps, bloodbridge-express-api, bloodbridge-responsive-ui and bloodbridge-testing. Inspect current camp routes, v_public_donation_camps, approval procedure and capacity trigger. Build the responsive camp creation, submission, approval, district filter and donor registration UI; include loading/empty/error states and Asia/Colombo time display. Add organization permission and capacity race tests. GN, PostGIS radius and SMS are out of scope unless existing P0 passes. Work in feature/m5-camps.
```

## Member 6 — Shared UI + analytics and ETL
```text
Use bloodbridge-responsive-ui, bloodbridge-warehouse-analytics, bloodbridge-team-delivery and bloodbridge-testing. Consolidate light dashboard components and the navy/red landing under one design system; reference design/responsive_reference.html. Build the small end-to-end ETL to a separate warehouse using synthetic data, idempotent loading, a recorded refresh time and trustworthy basic district/month charts. Integrate role dashboards without overwriting other developers' feature files; delegate shared components via folders. Ensure mobile 390/768/1440 and reduced-motion. Work in feature/m6-ui-analytics.
```

## Integration prompt (Friday gate)
```text
Act as release reviewer using bloodbridge-team-delivery and bloodbridge-testing. Inspect all merged branches against AGENTS.md. Verify Docker Compose config, one-command startup, implemented vs proposed API contracts, 001/007 migrations applied on a clean disposable DB, SQL objects, real health/role flows, donor->camp registration, hospital request->single-unit reservation->movement log, warehouse data reconciliation, and 390/768/1440 responsiveness. Produce PASS/FAIL/NOT RUN matrix and prioritize blockers. Do not claim success for tests not executed. Do not reset the shared DB.
```

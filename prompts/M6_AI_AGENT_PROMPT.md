# AI implementation prompt — Member 6 (Data Warehouse, OLAP, Benchmarking & Integration QA)

Open the BloodBridge monorepo. Read `AGENTS.md`, `README.md`, `docs/TEAM_DEVELOPMENT_GUIDELINES.md`, the attached TDD handoff `members/M06_warehouse_analytics.md`, the Master Test Catalog, `docs/02_SCHEMA_AND_MIGRATION_GATES.md`, and the module-appropriate `.agents/skills/*/SKILL.md`.

**MANDATORY GIT FLOW**
1. `git status --short`; safely save any uncommitted work.
2. `git fetch origin --prune`.
3. Create `feature/m6-warehouse-analytics` from `origin/dev` or, if already created, update safely.
4. NEVER modify `main`/`dev` directly, force push, or rewrite shared branch history.

**DO TESTS FIRST:** Implement real failing backend, SQL and frontend assertions for assigned P0 case IDs. Capture RED output. Only after that implement the module's DB objects/APIs/responsive pages. Add tests for failure paths, authorization and concurrent usage. Do not count test.todo as test coverage.

**SQL OWNERSHIP:** mv_monthly_donation_counts; mv_monthly_request_demand; v_admin_district_kpis (NEW); fn_etl_quality_counts (NEW optional); dedicated ETL SQL/scripts with conflict handling. The database lead approves schema and migration version numbers. The v2 scripts are not yet merged; reconcile with existing `010_runtime_privileges.sql` and version ledger.

**BACKEND:** GET /api/v1/analytics/summary; GET /api/v1/analytics/donation-trends; GET /api/v1/analytics/request-demand; GET /api/v1/analytics/camp-participation; GET /api/v1/analytics/etl-status; POST /api/v1/analytics/etl/refresh (admin only; controlled); GET /api/v1/analytics/benchmark-results (precomputed only).

**UI AND NAVIGATION:** Admin /admin/dashboard, /admin/analytics, /admin/analytics/donations, /admin/analytics/requests, /admin/analytics/camps, /admin/database-performance. Forms: Date range/date grain, district, blood type, component, institutional scope; explicit refresh control and confirm; benchmark comparison dataset/experiment selector (allowlisted, not raw SQL editor); download aggregate CSV (optional). Navigation: Admin sidebar → Overview → Donation Trends/Request Demand/Camps; Admin → Database Performance; filters update charts, breadcrumbs back; mobile chart cards and horizontally scrollable tables.

**QUALITY GATE:** Confirm every owned P0 test passes and full project tests/build pass. Update OpenAPI, ERD, README and PR notes. Push feature branch, create PR **targeting `dev`** with evidence and screenshots. Do not auto-merge. Return branch, commits, SQL objects, API routes, UI pages, tests executed, remaining limitations and PR URL.

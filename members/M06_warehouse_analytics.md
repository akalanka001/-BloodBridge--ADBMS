# Member 6 — Data Warehouse, OLAP, Benchmarking & Integration QA

**Dedicated branch:** `feature/m6-warehouse-analytics` · **PR base:** `dev` · **Priority:** P0 tests before P1 enhancements.

## Phase 0 — Git branch creation (MANDATORY)

```bash
git status --short                   # If non-empty, commit/stash YOUR current work safely
 git fetch origin --prune            # MUST fetch latest dev before branching
 git switch -c feature/m6-warehouse-analytics origin/dev
 git status -sb                       # Confirm your feature branch, not dev/main
 # FIRST write your module tests; run and record expected RED failure
 # THEN implement DB/API/UI; run targeted tests until GREEN
 git add -p                           # Stage only your module changes, review patch interactively
 git commit -m "feat(m6): implement warehouse-analytics with TDD"
 git push -u origin feature/m6-warehouse-analytics
 # GitHub PR: HEAD=feature/m6-warehouse-analytics BASE=dev (never main), request DB lead + dependent member review
```

If feature branch already exists locally, `git switch feature/m6-warehouse-analytics; git fetch origin --prune; git rebase origin/dev` **only if your branch isn't shared/reviewed**; otherwise coordinate merges with the team. Never reset or force push `dev`. Keep `main` untouched (unrelated history).

## Phase 1 — Create ALL module test cases FIRST

- Test IDs assigned: **42 module-specific scenarios** plus **45 shared cases**.
- Start by copying/writing tests in a new file, e.g. `backend/test/m6-warehouse-analytics.test.js` and `frontend/src/pages/.../*.test.jsx`. Use `node:test`+Supertest+pg and Vitest+Testing Library.
- Tests with a new endpoint/SQL object should fail for the **correct missing behavior** before implementation. Record RED output in your PR.
- Never merge failing tests to `dev`; do NOT consider `test.todo` passing coverage. Implement real checks for every P0 case.
- Allocate a dedicated disposable PostgreSQL DB; use unique synthetic email/UUID fixtures.

## Phase 2 — Database design and advanced objects

**Tables & relationships you must understand / own (coordinate shared tables):** separate bloodbridge_warehouse: dim_date, dim_district, dim_blood_type, dim_component, optional dim_bank/dim_camp; fact_donations, fact_request_items, fact_camp_registrations, etl_runs; OLTP mv_monthly_donation_counts and mv_monthly_request_demand.

**SQL operations/constraints to implement:** ETL with consistent grains and stable source ids, backfill dims before facts, safe upsert/idempotent rerun; refresh MVs; benchmark index performance EXPLAIN ANALYZE BUFFERS; scratch hash vs B-tree, heap/CLUSTER, partition pruning; aggregate no PII.

**Named views/functions/procedures/triggers:** mv_monthly_donation_counts; mv_monthly_request_demand; v_admin_district_kpis (NEW); fn_etl_quality_counts (NEW optional); dedicated ETL SQL/scripts with conflict handling.

**Key advanced concepts you must explain:** Star schema/fact grain, idempotent ETL, MATERIALIZED VIEW refresh, GROUP BY/ROLLUP, window functions, CTE, B-tree/hash/BRIN lab, partition pruning, CLUSTER, optimizer plans.

**Expected file areas:** `database/warehouse/005_warehouse_extension.sql; backend/src/routes/analytics.js; backend/src/jobs/etl.js or scripts/warehouse-etl.py (choose ONE); frontend/src/pages/Admin/Analytics*; frontend/src/pages/Admin/Performance*; database/experiments/*.sql; docs/DB_BENCHMARKS.md`.

**Migration constraints:** New v2 scripts are NOT yet in `dev`; first integrate the reviewed `011_domain_extensions.sql`, `012_advanced_workflows.sql`, `013_reporting_objects.sql` in the correct order. A current `010_runtime_privileges.sql` exists. Coordinate with Member 1, who allocates new migration version numbers; DO NOT edit executed migrations or duplicate objects.

## Phase 3 — Backend APIs and integration

Implement/document these **owned routes** (existing routes must remain compatible; proposed routes marked in shared contract):

GET /api/v1/analytics/summary; GET /api/v1/analytics/donation-trends; GET /api/v1/analytics/request-demand; GET /api/v1/analytics/camp-participation; GET /api/v1/analytics/etl-status; POST /api/v1/analytics/etl/refresh (admin only; controlled); GET /api/v1/analytics/benchmark-results (precomputed only).

Each route needs Zod validation, parameterized SQL, JWT, role authorization, institution membership checks, stable errors, pagination when listing, and testable DB operations. Every multi-step write uses `inTransaction` on a single `pg` connection; `CALL` procedures do not COMMIT internally. Update OpenAPI and `docs/API_IMPLEMENTED.md` only when actually implemented.

## Exact function → API → SQL → frontend ownership table

| Handler function | Method + `/api/v1` route | Authorized role | Inputs | SQL objects | Connected frontend |
|---|---|---|---|---|---|
| `getAnalyticsSummary` | `GET /analytics/summary` | ADMIN | dateFrom,dateTo,districtCode | warehouse aggregated fact query | AdminOverview |
| `getDonationTrends` | `GET /analytics/donation-trends` | ADMIN | groupBy,month,districtCode | fact_donations + dims | DonationTrendChart |
| `getRequestDemand` | `GET /analytics/request-demand` | ADMIN | dateRange,bloodType,component | mv_monthly_request_demand / warehouse facts | RequestDemandChart |
| `getCampParticipation` | `GET /analytics/camp-participation` | ADMIN | dateRange,districtCode | fact_camp_registrations | CampAnalyticsChart |
| `getETLStatus` | `GET /analytics/etl-status` | ADMIN | latest | etl_runs | ETLStatusCard |
| `refreshWarehouseETL` | `POST /analytics/etl/refresh` | ADMIN | approved run trigger | idempotent ETL with lock/job | RefreshETLDialog |
| `getBenchmarkResults` | `GET /analytics/benchmark-results` | ADMIN | experimentKey allowlist | stored measured EXPLAIN evidence | DBPerformanceComparison |

**Named handler functions are proposed implementation contracts**, not claims that JavaScript functions already exist. Add backend route handlers/services with these names or document a reviewed equivalent.

## Exact page/form/navigation map

| Route | Page component | Forms / controls | Navigation entry | Next action |
|---|---|---|---|---|
| `#/admin/analytics` | AnalyticsOverview | date,district,type filters | Admin sidebar Analytics | donations/requests/camps tabs |
| `#/admin/analytics/donations` | DonationAnalytics | monthly chart,warehouse age | Analytics tab | detail drilldown |
| `#/admin/analytics/requests` | RequestAnalytics | requests per group/component | Analytics tab | filters update graph |
| `#/admin/analytics/camps` | CampAnalytics | registrations/checkins/donations metrics | Analytics tab | reconciled totals |
| `#/admin/database-performance` | DatabasePerformance | experiment,dataset,actual timings | Admin sidebar DB Performance | compare plans, no arbitrary SQL |

## Phase 4 — Responsive frontend pages, forms, and navigation

**Pages/screens to build:** Admin /admin/dashboard, /admin/analytics, /admin/analytics/donations, /admin/analytics/requests, /admin/analytics/camps, /admin/database-performance.

**Forms and fields:** Date range/date grain, district, blood type, component, institutional scope; explicit refresh control and confirm; benchmark comparison dataset/experiment selector (allowlisted, not raw SQL editor); download aggregate CSV (optional).

**Navigation and role guards:** Admin sidebar → Overview → Donation Trends/Request Demand/Camps; Admin → Database Performance; filters update charts, breadcrumbs back; mobile chart cards and horizontally scrollable tables.

Responsive requirements: phone 390px, tablet 768px, desktop 1440px. Include loading, empty, validation and server error states; accessible focus states, labels, touch-friendly controls and keyboard paths. Reuse navy/red public theme and light role dashboards. Current application uses hash routing; do not install a second router without Member 1 integration approval.

## Phase 5 — Test cases you OWN

| Test ID | Priority | Layer | Scenario / action | Expected result |
|---|---|---|---|---|
| M6-001 | P0 | DB | Create warehouse schema in separate DB | No warehouse fact tables accidentally created in OLTP |
| M6-002 | P0 | DB | Load dimensions before facts | No dangling fact foreign keys |
| M6-003 | P0 | DB | Date dimension contains correct year/month/quarter | Date attributes derived correctly including month boundary |
| M6-004 | P0 | DB | Location/district dimension mapping | Correct province and district mapping |
| M6-005 | P0 | DB | Blood-type and component dimension mapping | Canonical codes and surrogate keys |
| M6-006 | P0 | DB | Fact grain for donations one source row each | Unique source donation IDs, correct counts |
| M6-007 | P0 | DB | Fact grain for requests one request item each | One unique source request item and correct measures |
| M6-008 | P0 | DB | Fact grain for registrations one registration each | No duplication from joins |
| M6-009 | P0 | DB | Incremental load after new donation | Only changed/new source rows added |
| M6-010 | P0 | DB | Full ETL rerun without source changes | Fact counts unchanged, no duplicates |
| M6-011 | P0 | DB | Failed ETL mid-load | Transaction rollback and FAILED metadata records safely captured |
| M6-012 | P1 | DB | OLTP donation canceled/corrected after load | Documented update strategy correctly re-syncs derived facts |
| M6-013 | P0 | DB | Warehouse schema inspected for names/email/phone | No donor personal identifying columns |
| M6-014 | P1 | DB | Non-admin analytics endpoint called | 403 and no data |
| M6-015 | P1 | DB | Monthly request materialized view before refresh | Can be stale, timestamps clarify snapshot |
| M6-016 | P1 | DB | Refresh materialized view after synthetic request | Counts agree with source aggregation |
| M6-017 | P1 | DB | Materialized view concurrent refresh | Unique index present and refresh succeeds |
| M6-018 | P1 | DB | Request received vs dispatched counts | Warehouse/analytics never equates dispatched with received |
| M6-019 | P1 | DB | Zero events in a district/month | 0/empty display not divide by zero or NaN |
| M6-020 | P1 | DB | SQL aggregation across district/type/component | Totals reconcile to canonical source |
| M6-021 | P2 | DB | B-tree and hash equality benchmark | Real timings and index sizes captured on same synthetic dataset |
| M6-022 | P2 | DB | BRIN on date-ordered historical data | Correct results and explain why effective/ineffective |
| M6-023 | P2 | DB | Heap size vs CLUSTER on disposable table | Capture physical size and plan |
| M6-024 | P2 | DB | Partition pruning on request-date predicate | Only relevant partitions planned/scanned |
| M6-025 | P1 | DB | EXPLAIN ANALYZE without index vs with index | Store actual plan, rows/time/buffers and dataset size |
| M6-026 | P1 | DB | Query planner selects seq scan on tiny table | Explain as valid plan; not assumed failure |
| M6-027 | P0 | API | GET summary as admin | 200 aggregate JSON, no names/email |
| M6-028 | P0 | API | GET request trends by date range | Sorted buckets, correct counts |
| M6-029 | P0 | API | GET request trends by invalid dates | 400 field errors |
| M6-030 | P0 | API | GET analytics with 1000-year range | Bounded period or rejected |
| M6-031 | P0 | API | POST ETL refresh as unauthorized user | 403 |
| M6-032 | P0 | API | POST refresh twice concurrently | One controlled execution or idempotent rescheduling |
| M6-033 | P1 | API | Benchmark results endpoint | Allowlisted precomputed experiments only, not arbitrary SQL |
| M6-034 | P0 | UI | Admin dashboard displays real aggregates | Correct units and time window labels |
| M6-035 | P0 | UI | Charts loading/error/empty | All render without crash |
| M6-036 | P0 | UI | Date range/district filter changes | Backend request reflected in graph and table |
| M6-037 | P0 | UI | Refresh button disabled while running | No duplicate request and screen reader status |
| M6-038 | P1 | UI | Tooltip/legend accessible on keyboard | Information available without mouse |
| M6-039 | P1 | UI | Benchmark chart uses measured not sample values | Dataset/time/units annotated, no fabricated speedup |
| M6-040 | P1 | UI | 390px admin cards/charts/table | Readable cards, scrollable table, no page overflow |
| M6-041 | P0 | E2E | Insert synthetic OLTP data→run ETL→dashboard | Reconciled warehouse aggregate matches UI and source |
| M6-042 | P0 | E2E | Run ETL second time→dashboard | No duplicate counts, consistent labels |

## Phase 6 — PR acceptance checklist

- [ ] Branch created from latest `origin/dev`, `git status -sb` correct.
- [ ] P0 tests written **before** implementation; RED output captured.
- [ ] SQL objects present, tested with success + invalid + race cases (if applicable).
- [ ] Real API tests check status, response shape, SQL side effects and unauthorized roles.
- [ ] Frontend forms connect to real API; field validation and role navigation tested.
- [ ] Loading, empty, error, confirmation and retry states work.
- [ ] 390/768/1440 viewport smoke + keyboard focus checks pass.
- [ ] `npm run test:backend`, `npm run test:frontend`, `npm run build`, CI checks pass in appropriate environment.
- [ ] API docs/ERD/migration ledger updated; no credentials or real medical details committed.
- [ ] Reviewer: Member 1 approves schema/SQL; dependent member reviews shared contracts.
- [ ] Push branch and open PR into `dev`; **do not self-merge**.

## Dependencies & handoff

M1 auth/admin/loc; M2 donations; M3 request items; M4 receipt states; M5 camp attendance; warehouse migration applied separately, never to OLTP.

**Viva requirement:** complete ALL shared advanced DB labs in `docs/05_ALL_MEMBER_ADVANCED_DB_PRACTICAL.md`, not only this module's SQL.

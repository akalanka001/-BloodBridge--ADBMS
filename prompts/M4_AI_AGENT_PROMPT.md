# AI implementation prompt — Member 4 (Donation Processing, Blood Unit Inventory & Fulfillment)

Open the BloodBridge monorepo. Read `AGENTS.md`, `README.md`, `docs/TEAM_DEVELOPMENT_GUIDELINES.md`, the attached TDD handoff `members/M04_inventory_fulfillment.md`, the Master Test Catalog, `docs/02_SCHEMA_AND_MIGRATION_GATES.md`, and the module-appropriate `.agents/skills/*/SKILL.md`.

**MANDATORY GIT FLOW**
1. `git status --short`; safely save any uncommitted work.
2. `git fetch origin --prune`.
3. Create `feature/m4-inventory-fulfillment` from `origin/dev` or, if already created, update safely.
4. NEVER modify `main`/`dev` directly, force push, or rewrite shared branch history.

**DO TESTS FIRST:** Implement real failing backend, SQL and frontend assertions for assigned P0 case IDs. Capture RED output. Only after that implement the module's DB objects/APIs/responsive pages. Add tests for failure paths, authorization and concurrent usage. Do not count test.todo as test coverage.

**SQL OWNERSHIP:** v_available_blood_stock (existing); v_stock_below_threshold; trg_validate_unit_source, trg_release_history, trg_log_blood_unit_status, trg_fulfillment_unit_integrity; transactional functions/procedures named above. The database lead approves schema and migration version numbers. The v2 scripts are not yet merged; reconcile with existing `010_runtime_privileges.sql` and version ledger.

**BACKEND:** POST /api/v1/donations; POST /api/v1/donations/:id/screening; POST /api/v1/units; POST /api/v1/units/:id/release; GET /api/v1/inventory/summary (existing); GET /api/v1/inventory/units; GET /api/v1/inventory/shortages; POST /api/v1/inventory/reservations (existing); POST /api/v1/inventory/reservations/:id/cancel; POST /api/v1/fulfillments; POST /api/v1/fulfillments/:id/units; POST /api/v1/fulfillments/:id/dispatch; POST /api/v1/fulfillments/:id/receive.

**UI AND NAVIGATION:** Blood Bank /bank/dashboard, /bank/donations/new, /bank/units, /bank/units/:id, /bank/requests, /bank/fulfillments/:id; Hospital /hospital/fulfillments/:id/receive. Forms: New donation: donor, bank, camp (optional), collected time; simulated screening decision; component-unit creation with expiry/type; release confirmation; inventory search by type/component/expiry; reservation picker; dispatch review and hospital receipt. Navigation: Bank dashboard → Donations → Screen → Unit → Release; Bank requests → Reserve → Fulfillment → Dispatch; Hospital request details → Receipt confirmation; mobile grouped tables and status stepper.

**QUALITY GATE:** Confirm every owned P0 test passes and full project tests/build pass. Update OpenAPI, ERD, README and PR notes. Push feature branch, create PR **targeting `dev`** with evidence and screenshots. Do not auto-merge. Return branch, commits, SQL objects, API routes, UI pages, tests executed, remaining limitations and PR URL.

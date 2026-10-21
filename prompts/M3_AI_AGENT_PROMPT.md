# AI implementation prompt — Member 3 (Hospital Blood Requests & Request Progress)

Open the BloodBridge monorepo. Read `AGENTS.md`, `README.md`, `docs/TEAM_DEVELOPMENT_GUIDELINES.md`, the attached TDD handoff `members/M03_hospital_requests.md`, the Master Test Catalog, `docs/02_SCHEMA_AND_MIGRATION_GATES.md`, and the module-appropriate `.agents/skills/*/SKILL.md`.

**MANDATORY GIT FLOW**
1. `git status --short`; safely save any uncommitted work.
2. `git fetch origin --prune`.
3. Create `feature/m3-hospital-requests` from `origin/dev` or, if already created, update safely.
4. NEVER modify `main`/`dev` directly, force push, or rewrite shared branch history.

**DO TESTS FIRST:** Implement real failing backend, SQL and frontend assertions for assigned P0 case IDs. Capture RED output. Only after that implement the module's DB objects/APIs/responsive pages. Add tests for failure paths, authorization and concurrent usage. Do not count test.todo as test coverage.

**SQL OWNERSHIP:** v_hospital_request_queue; v_request_received_progress; trg_request_history; fn_request_remaining_units (NEW); sp_cancel_blood_request (NEW after lifecycle review). The database lead approves schema and migration version numbers. The v2 scripts are not yet merged; reconcile with existing `010_runtime_privileges.sql` and version ledger.

**BACKEND:** GET/POST /api/v1/requests (existing, augment); GET /api/v1/requests/:id; GET /api/v1/requests/:id/progress; PATCH /api/v1/requests/:id/cancel; GET /api/v1/requests/:id/items; GET /api/v1/requests/:id/fulfillments.

**UI AND NAVIGATION:** Hospital /hospital/dashboard, /hospital/requests, /hospital/requests/new, /hospital/requests/:id, /hospital/requests/:id/progress. Forms: New request: hospital identity from authorized membership (not user-selectable arbitrary hospital), urgency, needed-by, notes, dynamic rows for blood group, component and units; request filter: urgency/status/date; cancel confirmation with reason. Navigation: Hospital dashboard → Requests → New Request → Details → Progress; detail → candidate search (M2) and receipts (M4); mobile back navigation and status breadcrumbs.

**QUALITY GATE:** Confirm every owned P0 test passes and full project tests/build pass. Update OpenAPI, ERD, README and PR notes. Push feature branch, create PR **targeting `dev`** with evidence and screenshots. Do not auto-merge. Return branch, commits, SQL objects, API routes, UI pages, tests executed, remaining limitations and PR URL.

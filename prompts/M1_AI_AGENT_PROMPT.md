# AI implementation prompt — Member 1 (Core Architecture, Identity, Institutions & Geography)

Open the BloodBridge monorepo. Read `AGENTS.md`, `README.md`, `docs/TEAM_DEVELOPMENT_GUIDELINES.md`, the attached TDD handoff `members/M01_core_identity_geo.md`, the Master Test Catalog, `docs/02_SCHEMA_AND_MIGRATION_GATES.md`, and the module-appropriate `.agents/skills/*/SKILL.md`.

**MANDATORY GIT FLOW**
1. `git status --short`; safely save any uncommitted work.
2. `git fetch origin --prune`.
3. Create `feature/m1-core-identity-geography` from `origin/dev` or, if already created, update safely.
4. NEVER modify `main`/`dev` directly, force push, or rewrite shared branch history.

**DO TESTS FIRST:** Implement real failing backend, SQL and frontend assertions for assigned P0 case IDs. Capture RED output. Only after that implement the module's DB objects/APIs/responsive pages. Add tests for failure paths, authorization and concurrent usage. Do not count test.todo as test coverage.

**SQL OWNERSHIP:** v_verified_institutions (NEW); fn_staff_has_institution_access(user_id, institution_type, institution_id) (NEW; SECURITY INVOKER); trg_institution_audit (NEW after review); migration 011_domain_extensions (after name conflict fix). The database lead approves schema and migration version numbers. The v2 scripts are not yet merged; reconcile with existing `010_runtime_privileges.sql` and version ledger.

**BACKEND:** GET /api/v1/locations/gn-divisions?dsCode=…; GET /api/v1/institutions?type=hospital|bank&districtCode=…; POST /api/v1/admin/institutions; PATCH /api/v1/admin/institutions/:id/verify; GET /api/v1/admin/staff; POST /api/v1/admin/staff-memberships; GET /api/v1/auth/me (existing, regression).

**UI AND NAVIGATION:** Public /register and /login; Admin /admin/institutions (table, filter, verify modal); /admin/staff (assignment form); reusable LocationSelector province→district→DS→optional GN. Forms: Register: full name/email/password/district/DS/GN (optional), validated opt-ins; Create institution: type, name, contact, region, venue; Assign staff: existing user, institution, active status; Verify institution: confirmation and audit reason. Navigation: Landing → Register/Login; authenticated Admin sidebar → Institutions → New/Details/Verify; Admin → Staff → Assign; location cascades shared by donor and camp forms.

**QUALITY GATE:** Confirm every owned P0 test passes and full project tests/build pass. Update OpenAPI, ERD, README and PR notes. Push feature branch, create PR **targeting `dev`** with evidence and screenshots. Do not auto-merge. Return branch, commits, SQL objects, API routes, UI pages, tests executed, remaining limitations and PR URL.

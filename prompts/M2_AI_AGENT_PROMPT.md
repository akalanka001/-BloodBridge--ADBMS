# AI implementation prompt — Member 2 (Donor Profiles, Availability, Matching & Contact)

Open the BloodBridge monorepo. Read `AGENTS.md`, `README.md`, `docs/TEAM_DEVELOPMENT_GUIDELINES.md`, the attached TDD handoff `members/M02_donors_matching.md`, the Master Test Catalog, `docs/02_SCHEMA_AND_MIGRATION_GATES.md`, and the module-appropriate `.agents/skills/*/SKILL.md`.

**MANDATORY GIT FLOW**
1. `git status --short`; safely save any uncommitted work.
2. `git fetch origin --prune`.
3. Create `feature/m2-donors-matching` from `origin/dev` or, if already created, update safely.
4. NEVER modify `main`/`dev` directly, force push, or rewrite shared branch history.

**DO TESTS FIRST:** Implement real failing backend, SQL and frontend assertions for assigned P0 case IDs. Capture RED output. Only after that implement the module's DB objects/APIs/responsive pages. Add tests for failure paths, authorization and concurrent usage. Do not count test.todo as test coverage.

**SQL OWNERSHIP:** fn_potential_donors (v2 012 workflows; coordinate schema lead); trg_donor_preference_history; v_donor_donation_summary; fn_select_contactable_donors_for_request (NEW if scope approved). The database lead approves schema and migration version numbers. The v2 scripts are not yet merged; reconcile with existing `010_runtime_privileges.sql` and version ledger.

**BACKEND:** GET/PATCH /api/v1/donors/me (expand existing); GET /api/v1/donors/me/donations; GET /api/v1/donors/me/invitations; POST /api/v1/donors/me/invitations/:id/respond; GET /api/v1/donors/candidates?requestItemId=…; POST /api/v1/requests/:id/invitations (staff only).

**UI AND NAVIGATION:** Donor /donor/dashboard, /donor/profile, /donor/history, /donor/invitations; Bank/Hospital authorized candidate panel /requests/:id/candidates. Forms: Profile: district/DS, blood-type edit only as self-reported, willing-to-contact, camp opt-in; candidate search: request item, district, max results; invitation response accept/decline; assessment form staff-only with no sensitive infection details. Navigation: Login donor → donor dashboard → profile/history/invitations; hospital request details → potential donors (authorized staff only) → invite; notifications → invitation detail.

**QUALITY GATE:** Confirm every owned P0 test passes and full project tests/build pass. Update OpenAPI, ERD, README and PR notes. Push feature branch, create PR **targeting `dev`** with evidence and screenshots. Do not auto-merge. Return branch, commits, SQL objects, API routes, UI pages, tests executed, remaining limitations and PR URL.

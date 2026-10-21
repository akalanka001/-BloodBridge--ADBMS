# AI implementation prompt — Member 5 (Donation Camps, Area Targeting, Check-ins & Scheduled Events)

Open the BloodBridge monorepo. Read `AGENTS.md`, `README.md`, `docs/TEAM_DEVELOPMENT_GUIDELINES.md`, the attached TDD handoff `members/M05_camps_outreach.md`, the Master Test Catalog, `docs/02_SCHEMA_AND_MIGRATION_GATES.md`, and the module-appropriate `.agents/skills/*/SKILL.md`.

**MANDATORY GIT FLOW**
1. `git status --short`; safely save any uncommitted work.
2. `git fetch origin --prune`.
3. Create `feature/m5-camps-outreach` from `origin/dev` or, if already created, update safely.
4. NEVER modify `main`/`dev` directly, force push, or rewrite shared branch history.

**DO TESTS FIRST:** Implement real failing backend, SQL and frontend assertions for assigned P0 case IDs. Capture RED output. Only after that implement the module's DB objects/APIs/responsive pages. Add tests for failure paths, authorization and concurrent usage. Do not count test.todo as test coverage.

**SQL OWNERSHIP:** v_public_donation_camps; v_camp_registration_summary; v_camp_attendance_progress; sp_approve_donation_camp; sp_record_camp_checkin; fn_camp_target_donor_ids; trg_check_camp_registration; sp_enqueue_camp_reminders (NEW OPTIONAL). The database lead approves schema and migration version numbers. The v2 scripts are not yet merged; reconcile with existing `010_runtime_privileges.sql` and version ledger.

**BACKEND:** GET /api/v1/camps (existing); GET /api/v1/camps/:id (existing); POST /api/v1/camps (existing); POST /api/v1/camps/:id/submit (existing); POST /api/v1/camps/:id/approve (existing); GET/POST /api/v1/camps/:id/target-areas; POST /api/v1/camps/:id/registrations (existing); GET /api/v1/camps/:id/registrations (staff only); POST /api/v1/camps/:id/checkins; PATCH /api/v1/camps/:id/cancel; GET /api/v1/donors/me/camps.

**UI AND NAVIGATION:** Public /camps, /camps/:id; Donor /donor/camps/registrations; Bank /bank/camps, /bank/camps/new, /bank/camps/:id, /bank/camps/:id/registrations, /bank/camps/:id/checkins, /bank/camps/:id/approval. Forms: Finder: province/district/DS/date filter; camp: title, organizer, coordinating bank, location/venue, start/end times, capacity, contact, area targets; approval review; registration confirm; check-in form; cancellation reason; notification preference. Navigation: Landing → Find Camps → Camp Details → Sign in/Registration; donor dashboard → My Camps; bank dashboard → Camps → Draft → Submit → Review/Approve → Attendees/Check-ins.

**QUALITY GATE:** Confirm every owned P0 test passes and full project tests/build pass. Update OpenAPI, ERD, README and PR notes. Push feature branch, create PR **targeting `dev`** with evidence and screenshots. Do not auto-merge. Return branch, commits, SQL objects, API routes, UI pages, tests executed, remaining limitations and PR URL.

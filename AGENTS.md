# BloodBridge — permanent AI coding agent instructions

These instructions apply to **all coding work** in this repository. Use the narrow skill for the active task (see `AI_SKILLS_README.md`). Do not replace this file with a generic generated agents prompt.

## Project and deadline
BloodBridge is a Sri Lankan blood-donation / emergency request coordination **university prototype**, not a clinically validated blood transfusion system. Six contributors target a tested demonstration by **Friday, 23 October 2026** (before Saturday). The uploaded university brief allows a maximum of five; confirm approval for six with lecturer.

## Repository: inspect first, build within its current architecture
- One repository: `frontend/` (React 18, Vite 6, JavaScript/JSX, current CSS, lucide-react), `backend/` (Express 4, JavaScript ESM, `pg`, Zod, JWT), `database/` (PostgreSQL 16 SQL); Docker Compose owns the local runtime.
- `npm run dev` at the root invokes `docker compose up --build` and brings up all three. No need for separate repositories, duplicate API servers, ORM migration tools, or framework changes.
- Frontend requests relative `/api/v1/*`; Vite proxies to Docker API `api:4000`. Never connect browser code directly to PostgreSQL or expose secrets in Vite env vars.
- Inspect `README.md`, `docs/ARCHITECTURE.md`, `docs/API_IMPLEMENTED.md`, `database/migrations/001_schema.sql`, and relevant code **before** modifying anything. `docs/PLANNED_OPENAPI.yaml` is a roadmap, NOT evidence of implementation.
- Final UI decision: **navy/red animated public landing, light dashboards**, camp finder uses search-centric concept. Source reference: `design/responsive_reference.html`, tokens in README. Do not create competing designs or alter all pages arbitrarily.

## Database-first / contract-first rules
1. `database/migrations/001_schema.sql` is the existing schema baseline; advanced PostgreSQL objects are in `database/migrations/007_advanced_objects.sql`. On shared DBs add `010_...sql`, `011_...sql` etc; never silently edit already-applied migrations.
2. Database lead approves schema + migration changes. Update `docs/ERD_REVISED.mmd`, data dictionary/constraints, API contract and regression tests together.
3. Use parameterized SQL, named transaction boundaries with a single pg client, rollback on error; never call `pool.query` from inside a `client` transaction.
4. Reuse existing views, PL/pgSQL functions, procedures, and triggers. Example: `fn_reserve_blood_unit`, `sp_approve_donation_camp`, `v_available_blood_stock`, `v_public_donation_camps`. Do not duplicate their logic in JavaScript.
5. Distinguish potential donor matching from medically screened eligibility and released component-unit inventory. Never infer transfusion compatibility or donation clearance in code.
6. Geography: **province → district → DS division → optional GN division**. Municipal/Urban Councils are a separate local-government dimension. Hospitals/blood banks/camp venues are organizations or locations, not levels of that hierarchy. Existing seed codes are **synthetic examples**, not certified national code lists.
7. Treat donors' contact/location and institutional data as sensitive. Scope authorized staff to assigned organizations; use synthetic demonstrations. No real donors, patient records, or purportedly live stock figures.

## Task protocol (mandatory)
- Establish existing state: files touched, implemented vs missing API/features, relevant schema and constraints.
- Make a small, coherent plan with acceptance criteria. Avoid unrelated rewrites and dependency additions under the sprint deadline.
- Change the smallest necessary files; include SQL migration + backend contract + UI + tests where relevant.
- Run applicable checks (`docker compose config`, backend `npm test`, frontend `npm run build`, SQL verification against a real database, relevant integration checks). If execution isn't possible, explicitly say **not run** and why.
- Provide handoff: files changed, migrations to run, API examples, verification evidence, known blockers. Never claim tests, migration execution, screenshots, or clinical approval without evidence.

## Team module ownership
- M1 schema/ERD/advanced SQL approval & benchmark; M2 auth/geography/donors; M3 hospital requests/matching; M4 blood units/reservations/fulfillment; M5 donation camps/targeting/approvals; M6 responsive shared UI + warehouse/ETL/analytics.
- One feature branch per member (`feature/m1-database`, etc.), PR review by another member, no force-push to shared main, keep `npm run dev` working.

## Skill catalog
`bloodbridge-architecture`, `bloodbridge-database-design`, `bloodbridge-advanced-postgres`, `bloodbridge-inventory-transactions`, `bloodbridge-express-api`, `bloodbridge-geography-camps`, `bloodbridge-responsive-ui`, `bloodbridge-warehouse-analytics`, `bloodbridge-testing`, `bloodbridge-team-delivery` under `.agents/skills/` (mirrored at `.claude/skills/`). Read only the applicable skill(s) plus this file; avoid massive context dumps.

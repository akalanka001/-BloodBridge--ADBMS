# Member 1 — Core Architecture, Identity, Institutions & Geography

**Dedicated branch:** `feature/m1-core-identity-geography` · **PR base:** `dev` · **Priority:** P0 tests before P1 enhancements.

## Phase 0 — Git branch creation (MANDATORY)

```bash
git status --short                   # If non-empty, commit/stash YOUR current work safely
 git fetch origin --prune            # MUST fetch latest dev before branching
 git switch -c feature/m1-core-identity-geography origin/dev
 git status -sb                       # Confirm your feature branch, not dev/main
 # FIRST write your module tests; run and record expected RED failure
 # THEN implement DB/API/UI; run targeted tests until GREEN
 git add -p                           # Stage only your module changes, review patch interactively
 git commit -m "feat(m1): implement core-identity-geo with TDD"
 git push -u origin feature/m1-core-identity-geography
 # GitHub PR: HEAD=feature/m1-core-identity-geography BASE=dev (never main), request DB lead + dependent member review
```

If feature branch already exists locally, `git switch feature/m1-core-identity-geography; git fetch origin --prune; git rebase origin/dev` **only if your branch isn't shared/reviewed**; otherwise coordinate merges with the team. Never reset or force push `dev`. Keep `main` untouched (unrelated history).

## Phase 1 — Create ALL module test cases FIRST

- Test IDs assigned: **43 module-specific scenarios** plus **45 shared cases**.
- Start by copying/writing tests in a new file, e.g. `backend/test/m1-core-identity-geo.test.js` and `frontend/src/pages/.../*.test.jsx`. Use `node:test`+Supertest+pg and Vitest+Testing Library.
- Tests with a new endpoint/SQL object should fail for the **correct missing behavior** before implementation. Record RED output in your PR.
- Never merge failing tests to `dev`; do NOT consider `test.todo` passing coverage. Implement real checks for every P0 case.
- Allocate a dedicated disposable PostgreSQL DB; use unique synthetic email/UUID fixtures.

## Phase 2 — Database design and advanced objects

**Tables & relationships you must understand / own (coordinate shared tables):** users, staff_memberships, hospitals, blood_banks, blood_bank_clusters, provinces, districts, ds_divisions, gn_divisions, locations, audit_logs, schema_migrations.

**SQL operations/constraints to implement:** Composite FK and GN-DS-district constraints; membership checks; indexes for area lookup; read-only institution directory view; audit of institution verification; privileges for app runtime; safe migration ledger.

**Named views/functions/procedures/triggers:** v_verified_institutions (NEW); fn_staff_has_institution_access(user_id, institution_type, institution_id) (NEW; SECURITY INVOKER); trg_institution_audit (NEW after review); migration 011_domain_extensions (after name conflict fix).

**Key advanced concepts you must explain:** PK/FK/UNIQUE/CHECK, 3NF, composite FK, views, transaction/migrations, indexes, EXPLAIN, GRANT and default privileges, triggers/auditing.

**Expected file areas:** `database/migrations/011_domain_extensions.sql (shared schema baseline); backend/src/middleware/auth.js; backend/src/routes/auth.js; backend/src/routes/locations.js; backend/src/routes/institutions.js (new); frontend/src/pages/Auth/*; frontend/src/pages/Admin/Institutions*; frontend/src/components/LocationSelector*`.

**Migration constraints:** New v2 scripts are NOT yet in `dev`; first integrate the reviewed `011_domain_extensions.sql`, `012_advanced_workflows.sql`, `013_reporting_objects.sql` in the correct order. A current `010_runtime_privileges.sql` exists. Coordinate with Member 1, who allocates new migration version numbers; DO NOT edit executed migrations or duplicate objects.

## Phase 3 — Backend APIs and integration

Implement/document these **owned routes** (existing routes must remain compatible; proposed routes marked in shared contract):

GET /api/v1/locations/gn-divisions?dsCode=…; GET /api/v1/institutions?type=hospital|bank&districtCode=…; POST /api/v1/admin/institutions; PATCH /api/v1/admin/institutions/:id/verify; GET /api/v1/admin/staff; POST /api/v1/admin/staff-memberships; GET /api/v1/auth/me (existing, regression).

Each route needs Zod validation, parameterized SQL, JWT, role authorization, institution membership checks, stable errors, pagination when listing, and testable DB operations. Every multi-step write uses `inTransaction` on a single `pg` connection; `CALL` procedures do not COMMIT internally. Update OpenAPI and `docs/API_IMPLEMENTED.md` only when actually implemented.

## Exact function → API → SQL → frontend ownership table

| Handler function | Method + `/api/v1` route | Authorized role | Inputs | SQL objects | Connected frontend |
|---|---|---|---|---|---|
| `getGnDivisions` | `GET /locations/gn-divisions` | Public | dsCode required | gn_divisions FK through ds_divisions | LocationSelector |
| `listInstitutions` | `GET /institutions` | Public/Staff safe | type,districtCode,verified | v_verified_institutions (proposed) | InstitutionPicker |
| `createInstitution` | `POST /admin/institutions` | ADMIN | name,type,locationId,phone | hospitals/blood_banks + audit | NewInstitutionForm |
| `verifyInstitution` | `PATCH /admin/institutions/:id/verify` | ADMIN | verified:boolean,reason | institution verification update + audit transaction | InstitutionReviewDialog |
| `listStaff` | `GET /admin/staff` | ADMIN | institutionId,role,page | users + staff_memberships join | StaffTable |
| `assignStaffMembership` | `POST /admin/staff-memberships` | ADMIN | userId,institutionType,institutionId | staff_memberships unique/check | AssignStaffForm |
| `revokeStaffMembership` | `PATCH /admin/staff-memberships/:id` | ADMIN | isActive:false | staff_memberships and immediate auth checks | StaffRowActions |
| `getOwnAccount` | `GET /auth/me` | Authenticated | Bearer token | users active state | AccountMenu |

**Named handler functions are proposed implementation contracts**, not claims that JavaScript functions already exist. Add backend route handlers/services with these names or document a reviewed equivalent.

## Exact page/form/navigation map

| Route | Page component | Forms / controls | Navigation entry | Next action |
|---|---|---|---|---|
| `#/login` | LoginPage | email,password,forgot state | from public navbar | Auth success sends user to role dashboard |
| `#/register` | DonorRegistration | name,email,password,province,district,DS,GN? | from landing Become a Donor | success goes to Login with notice |
| `#/admin/institutions` | InstitutionList | type,district,verified,search | Admin sidebar Institutions | row→InstitutionReview |
| `#/admin/staff` | StaffMemberships | user,role,institution,active | Admin sidebar Staff | after save refresh list |

## Phase 4 — Responsive frontend pages, forms, and navigation

**Pages/screens to build:** Public /register and /login; Admin /admin/institutions (table, filter, verify modal); /admin/staff (assignment form); reusable LocationSelector province→district→DS→optional GN.

**Forms and fields:** Register: full name/email/password/district/DS/GN (optional), validated opt-ins; Create institution: type, name, contact, region, venue; Assign staff: existing user, institution, active status; Verify institution: confirmation and audit reason.

**Navigation and role guards:** Landing → Register/Login; authenticated Admin sidebar → Institutions → New/Details/Verify; Admin → Staff → Assign; location cascades shared by donor and camp forms.

Responsive requirements: phone 390px, tablet 768px, desktop 1440px. Include loading, empty, validation and server error states; accessible focus states, labels, touch-friendly controls and keyboard paths. Reuse navy/red public theme and light role dashboards. Current application uses hash routing; do not install a second router without Member 1 integration approval.

## Phase 5 — Test cases you OWN

| Test ID | Priority | Layer | Scenario / action | Expected result |
|---|---|---|---|---|
| M1-001 | P0 | DB | All province and district codes unique | Duplicate administrative code rejected |
| M1-002 | P0 | DB | Location district and DS mismatch | Composite FK rejects mismatch |
| M1-003 | P0 | DB | GN code provided without DS | CHECK rejects invalid location |
| M1-004 | P0 | DB | GN belongs to a different DS | Composite FK rejects mismatch |
| M1-005 | P0 | DB | Null GN supplied | Valid location and donor registration allowed |
| M1-006 | P0 | DB | Invalid coordinate latitude 91 or longitude -181 | CHECK rejects out-of-range values |
| M1-007 | P0 | DB | Latitude provided without longitude | CHECK rejects incomplete coordinates |
| M1-008 | P0 | DB | Duplicate user emails with case variation | Case-insensitive uniqueness per approved contract; no duplicates |
| M1-009 | P1 | DB | Membership row links both hospital and blood bank | CHECK rejects ambiguous membership |
| M1-010 | P1 | DB | Membership row links neither institution | CHECK rejects invalid membership |
| M1-011 | P1 | DB | Assign staff to non-existent institution | FK blocks write |
| M1-012 | P1 | DB | Inactive user attempts institution write | 401 or 403 with no change |
| M1-013 | P1 | DB | Active admin verifies valid institution | Status change and audit row persist |
| M1-014 | P1 | DB | Hospital staff tries admin verification | 403, no status or audit change |
| M1-015 | P1 | DB | Bank staff tries other bank organization update | 403, data unchanged |
| M1-016 | P0 | API | Register donor with valid district and password | 201 and exactly one user plus donor; password hashed |
| M1-017 | P0 | API | Register donor with invalid email | 400 with field errors |
| M1-018 | P0 | API | Register donor with short password | 400 with no user created |
| M1-019 | P0 | API | Register donor with duplicate email | 409, no duplicate donor |
| M1-020 | P0 | API | Login valid donor | 200 with access token and correct role |
| M1-021 | P0 | API | Login incorrect password | 401 without revealing account existence |
| M1-022 | P0 | API | Expired/bad-signature JWT | 401 |
| M1-023 | P0 | API | Inactive user JWT | 401 even with otherwise valid token |
| M1-024 | P0 | API | Missing bearer token for admin routes | 401 |
| M1-025 | P1 | API | Districts filtered by province | Only requested province returned |
| M1-026 | P1 | API | DS divisions filtered by district | Only matching district returned |
| M1-027 | P1 | API | GN divisions filtered by DS | Only matching DS returned |
| M1-028 | P1 | API | Unknown parent code | 200 empty list or 404 per documented contract, no 500 |
| M1-029 | P1 | API | List verified institutions scoped by type/district | Result includes authorized public columns only |
| M1-030 | P1 | API | Verify unverified institution as admin | 200 and audit row |
| M1-031 | P1 | API | Create institution missing location | 400 with stable error |
| M1-032 | P1 | API | Create bank with invalid hospital reference | 400/409; no orphan |
| M1-033 | P2 | API | Deactivate staff membership | Subsequent access denied immediately |
| M1-034 | P0 | UI | Registration form requires email/password/district | Inline errors and prevented submission |
| M1-035 | P0 | UI | Province changes after district/DS selected | Child selections reset; stale codes not submitted |
| M1-036 | P0 | UI | District changes after DS/GN selected | DS and GN reset |
| M1-037 | P0 | UI | Missing DS dataset for area | Graceful empty state, not permanent spinner |
| M1-038 | P1 | UI | Password visibility toggle | Accessible control, no accidental submit |
| M1-039 | P1 | UI | Staff assignment form loaded by admin | Institution options filtered and save reflects API |
| M1-040 | P0 | UI | Unauthorized visitor opens admin URL directly | No protected records exposed; redirected to login/forbidden |
| M1-041 | P1 | UI | 390px institution list and forms | No sideways page overflow, keyboard navigable |
| M1-042 | P0 | E2E | Donor registers then logs in | Role-specific route and correct persisted profile |
| M1-043 | P0 | E2E | Admin assigns staff to bank then revokes | Authorization changes from allowed to denied |

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

Lead initial schema/contract PR; shared route/nav slot only author; coordinate with M2 donor and M5 camp for location selector; approve all migration names.

**Viva requirement:** complete ALL shared advanced DB labs in `docs/05_ALL_MEMBER_ADVANCED_DB_PRACTICAL.md`, not only this module's SQL.

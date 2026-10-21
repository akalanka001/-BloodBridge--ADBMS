# Member 2 — Donor Profiles, Availability, Matching & Contact

**Dedicated branch:** `feature/m2-donors-matching` · **PR base:** `dev` · **Priority:** P0 tests before P1 enhancements.

## Phase 0 — Git branch creation (MANDATORY)

```bash
git status --short                   # If non-empty, commit/stash YOUR current work safely
 git fetch origin --prune            # MUST fetch latest dev before branching
 git switch -c feature/m2-donors-matching origin/dev
 git status -sb                       # Confirm your feature branch, not dev/main
 # FIRST write your module tests; run and record expected RED failure
 # THEN implement DB/API/UI; run targeted tests until GREEN
 git add -p                           # Stage only your module changes, review patch interactively
 git commit -m "feat(m2): implement donors-matching with TDD"
 git push -u origin feature/m2-donors-matching
 # GitHub PR: HEAD=feature/m2-donors-matching BASE=dev (never main), request DB lead + dependent member review
```

If feature branch already exists locally, `git switch feature/m2-donors-matching; git fetch origin --prune; git rebase origin/dev` **only if your branch isn't shared/reviewed**; otherwise coordinate merges with the team. Never reset or force push `dev`. Keep `main` untouched (unrelated history).

## Phase 1 — Create ALL module test cases FIRST

- Test IDs assigned: **41 module-specific scenarios** plus **45 shared cases**.
- Start by copying/writing tests in a new file, e.g. `backend/test/m2-donors-matching.test.js` and `frontend/src/pages/.../*.test.jsx`. Use `node:test`+Supertest+pg and Vitest+Testing Library.
- Tests with a new endpoint/SQL object should fail for the **correct missing behavior** before implementation. Record RED output in your PR.
- Never merge failing tests to `dev`; do NOT consider `test.todo` passing coverage. Implement real checks for every P0 case.
- Allocate a dedicated disposable PostgreSQL DB; use unique synthetic email/UUID fixtures.

## Phase 2 — Database design and advanced objects

**Tables & relationships you must understand / own (coordinate shared tables):** donors, donor_availability_events, donor_assessments, donations (read), donor_matches, donor_contact_events, notifications (shared).

**SQL operations/constraints to implement:** fn_potential_donors(exact type,district,minimum months,limit); fn_update_donor_preferences (optional); trigger donor availability history; partial/composite donor index; read-only donor donation summary; idempotent match/invitation writes.

**Named views/functions/procedures/triggers:** fn_potential_donors (v2 012 workflows; coordinate schema lead); trg_donor_preference_history; v_donor_donation_summary; fn_select_contactable_donors_for_request (NEW if scope approved).

**Key advanced concepts you must explain:** SQL UDFs, correlated NOT EXISTS, partial indexes, hash-vs-B-tree scratch benchmark, trigger history, transactions, constrained consent, EXPLAIN.

**Expected file areas:** `backend/src/routes/donors.js; backend/src/routes/matches.js (new); frontend/src/pages/Donor/*; frontend/src/pages/Bank/DonorCandidates*; database/migrations/014_donor_matching.sql if needed`.

**Migration constraints:** New v2 scripts are NOT yet in `dev`; first integrate the reviewed `011_domain_extensions.sql`, `012_advanced_workflows.sql`, `013_reporting_objects.sql` in the correct order. A current `010_runtime_privileges.sql` exists. Coordinate with Member 1, who allocates new migration version numbers; DO NOT edit executed migrations or duplicate objects.

## Phase 3 — Backend APIs and integration

Implement/document these **owned routes** (existing routes must remain compatible; proposed routes marked in shared contract):

GET/PATCH /api/v1/donors/me (expand existing); GET /api/v1/donors/me/donations; GET /api/v1/donors/me/invitations; POST /api/v1/donors/me/invitations/:id/respond; GET /api/v1/donors/candidates?requestItemId=…; POST /api/v1/requests/:id/invitations (staff only).

Each route needs Zod validation, parameterized SQL, JWT, role authorization, institution membership checks, stable errors, pagination when listing, and testable DB operations. Every multi-step write uses `inTransaction` on a single `pg` connection; `CALL` procedures do not COMMIT internally. Update OpenAPI and `docs/API_IMPLEMENTED.md` only when actually implemented.

## Exact function → API → SQL → frontend ownership table

| Handler function | Method + `/api/v1` route | Authorized role | Inputs | SQL objects | Connected frontend |
|---|---|---|---|---|---|
| `getDonorProfile` | `GET /donors/me` | DONOR | Bearer token | donors scoped by user id | DonorProfile |
| `updateDonorProfile` | `PATCH /donors/me` | DONOR | districtCode,dsCode,gnCode,bloodTypeCode self reported | donors + composite geography constraint | DonorProfileForm |
| `updateContactPreferences` | `PATCH /donors/me/preferences` | DONOR | availableForContact,campNotificationsOptIn | trg_donor_preference_history | DonorPreferenceForm |
| `getDonationHistory` | `GET /donors/me/donations` | DONOR | page,pageSize | donations ORDER BY collected_at desc | DonationHistory |
| `getInvitations` | `GET /donors/me/invitations` | DONOR | status,page | donor_matches/contact events scoped | InvitationInbox |
| `respondInvitation` | `POST /donors/me/invitations/:id/respond` | DONOR | response ACCEPTED/DECLINED | donor_matches transition + donor_contact_events | InvitationDecisionDialog |
| `getPotentialCandidates` | `GET /donors/candidates` | Authorized BANK/HOSPITAL staff | requestItemId,districtCode,limit | fn_potential_donors plus institution access | CandidateSearch |
| `invitePotentialDonor` | `POST /requests/:id/invitations` | Authorized staff | donorId,requestItemId | donor_matches/contact event/notifications tx | InviteDonorDialog |

**Named handler functions are proposed implementation contracts**, not claims that JavaScript functions already exist. Add backend route handlers/services with these names or document a reviewed equivalent.

## Exact page/form/navigation map

| Route | Page component | Forms / controls | Navigation entry | Next action |
|---|---|---|---|---|
| `#/donor/dashboard` | DonorDashboard | availability badges, shortcuts | Login donor landing | profile, history, invitations |
| `#/donor/profile` | DonorProfile | area,blood group self-report,2 opt-ins | Donor sidebar Profile | save then refresh |
| `#/donor/history` | DonationHistory | pagination,date filters | Donor sidebar History | read-only records |
| `#/donor/invitations` | DonorInvitations | status filter, accept/decline | Donor sidebar Invitations | detail and decision |
| `#/hospital/requests/:id/candidates` | PotentialDonors | request item,district,limit | Hospital request details Candidates | invite candidate |

## Phase 4 — Responsive frontend pages, forms, and navigation

**Pages/screens to build:** Donor /donor/dashboard, /donor/profile, /donor/history, /donor/invitations; Bank/Hospital authorized candidate panel /requests/:id/candidates.

**Forms and fields:** Profile: district/DS, blood-type edit only as self-reported, willing-to-contact, camp opt-in; candidate search: request item, district, max results; invitation response accept/decline; assessment form staff-only with no sensitive infection details.

**Navigation and role guards:** Login donor → donor dashboard → profile/history/invitations; hospital request details → potential donors (authorized staff only) → invite; notifications → invitation detail.

Responsive requirements: phone 390px, tablet 768px, desktop 1440px. Include loading, empty, validation and server error states; accessible focus states, labels, touch-friendly controls and keyboard paths. Reuse navy/red public theme and light role dashboards. Current application uses hash routing; do not install a second router without Member 1 integration approval.

## Phase 5 — Test cases you OWN

| Test ID | Priority | Layer | Scenario / action | Expected result |
|---|---|---|---|---|
| M2-001 | P0 | DB | Unknown blood group saved as NULL | Profile valid and matching excludes unknown |
| M2-002 | P0 | DB | Donor created without associated user | FK rejects |
| M2-003 | P0 | DB | Two profiles for same user | Unique constraint rejects |
| M2-004 | P0 | DB | Set contact preference false→true | One availability history event created |
| M2-005 | P0 | DB | Save same preferences twice | No redundant change-event record |
| M2-006 | P0 | DB | Set camp opt-in true→false | Targeting excludes donor immediately |
| M2-007 | P0 | DB | Recent donation within configured interval | Potential-donor function excludes donor without declaring permanent ineligibility |
| M2-008 | P0 | DB | Latest assessment deferred with no end | Exclude from candidate list |
| M2-009 | P0 | DB | Deferred until in past | Candidate may be considered subject to other filters; no auto clinical clearance |
| M2-010 | P1 | DB | Assessment CLEARED_BY_STAFF but opted out | Donor excluded from contact list |
| M2-011 | P1 | DB | District matches but blood type differs | Candidate excluded |
| M2-012 | P1 | DB | Correct type and area and opted in | Candidate included, no diagnosis exposed |
| M2-013 | P1 | DB | Candidate list limit zero/negative/huge | Bounded safe limit per function contract |
| M2-014 | P1 | DB | Same donor matched to same request item twice | Idempotent or conflict; only one match row |
| M2-015 | P1 | DB | Match invitation sent twice on retry | Only one active invitation according to idempotency contract |
| M2-016 | P1 | DB | Accept invitation after cancellation | Rejected, original state unchanged |
| M2-017 | P1 | DB | Donor contact event logged on invitation | Actor, time, request/match and non-sensitive status recorded |
| M2-018 | P0 | API | Donor GET own profile | 200 with own data, no other donor PII |
| M2-019 | P0 | API | Donor PATCH availability/opt-in | 200 and DB history; retry stable |
| M2-020 | P0 | API | Unknown property injected in PATCH | Rejected or ignored safely per documented contract |
| M2-021 | P0 | API | Donor requests other donor ID via URL tampering | 403/404, never returns target |
| M2-022 | P0 | API | Donor GET history no donations | 200 empty array, correct total |
| M2-023 | P0 | API | Donor GET history with many donations | Stable page order and pagination |
| M2-024 | P0 | API | Unauthenticated candidate search | 401 |
| M2-025 | P0 | API | Normal donor calls staff-only candidate search | 403 |
| M2-026 | P0 | API | Bank staff from unrelated bank searches private request | 403/404, no identity leakage |
| M2-027 | P1 | API | Authorized search with blood type and district | 200 safe potential matches with metadata |
| M2-028 | P1 | API | Staff invites eligible potential contact | 201/200, stored invitation + event |
| M2-029 | P1 | API | Staff invites donor without contact consent | 403/409, no notification |
| M2-030 | P1 | API | Invited donor responds ACCEPTED | 200; response belongs to current donor |
| M2-031 | P1 | API | Other donor responds to invitation ID | 403/404 |
| M2-032 | P1 | API | Double response to same invitation | Idempotent same response or conflict documented |
| M2-033 | P0 | UI | Donor profile shows saved preferences | Controls reflect API values after reload |
| M2-034 | P0 | UI | Saving preference fails network | Error shown and previous value restored |
| M2-035 | P0 | UI | Donation history loading/empty/error | All three UI states implemented |
| M2-036 | P0 | UI | Invitation list and detail actions | Accept/decline accessible and visibly persisted |
| M2-037 | P1 | UI | Donor opted out of contact | UI warns before sending; respects persisted opt-in |
| M2-038 | P1 | UI | Staff candidate list excludes medical clearance claims | Displays POTENTIAL, not verified eligibility |
| M2-039 | P1 | UI | 390px donor profile/history/invitations | Forms and cards readable, no x overflow |
| M2-040 | P0 | E2E | Preference toggle→trigger→event history | DB and UI agree on prior/new values |
| M2-041 | P0 | E2E | Opted-out donor never exposed in a fresh search | No unauthorized donor identity in payload |

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

M1 geography + authorization; M3 request_item_id, M5 notification targeting; no direct donor identifiers in public responses.

**Viva requirement:** complete ALL shared advanced DB labs in `docs/05_ALL_MEMBER_ADVANCED_DB_PRACTICAL.md`, not only this module's SQL.

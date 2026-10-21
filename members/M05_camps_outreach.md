# Member 5 — Donation Camps, Area Targeting, Check-ins & Scheduled Events

**Dedicated branch:** `feature/m5-camps-outreach` · **PR base:** `dev` · **Priority:** P0 tests before P1 enhancements.

## Phase 0 — Git branch creation (MANDATORY)

```bash
git status --short                   # If non-empty, commit/stash YOUR current work safely
 git fetch origin --prune            # MUST fetch latest dev before branching
 git switch -c feature/m5-camps-outreach origin/dev
 git status -sb                       # Confirm your feature branch, not dev/main
 # FIRST write your module tests; run and record expected RED failure
 # THEN implement DB/API/UI; run targeted tests until GREEN
 git add -p                           # Stage only your module changes, review patch interactively
 git commit -m "feat(m5): implement camps-outreach with TDD"
 git push -u origin feature/m5-camps-outreach
 # GitHub PR: HEAD=feature/m5-camps-outreach BASE=dev (never main), request DB lead + dependent member review
```

If feature branch already exists locally, `git switch feature/m5-camps-outreach; git fetch origin --prune; git rebase origin/dev` **only if your branch isn't shared/reviewed**; otherwise coordinate merges with the team. Never reset or force push `dev`. Keep `main` untouched (unrelated history).

## Phase 1 — Create ALL module test cases FIRST

- Test IDs assigned: **52 module-specific scenarios** plus **45 shared cases**.
- Start by copying/writing tests in a new file, e.g. `backend/test/m5-camps-outreach.test.js` and `frontend/src/pages/.../*.test.jsx`. Use `node:test`+Supertest+pg and Vitest+Testing Library.
- Tests with a new endpoint/SQL object should fail for the **correct missing behavior** before implementation. Record RED output in your PR.
- Never merge failing tests to `dev`; do NOT consider `test.todo` passing coverage. Implement real checks for every P0 case.
- Allocate a dedicated disposable PostgreSQL DB; use unique synthetic email/UUID fixtures.

## Phase 2 — Database design and advanced objects

**Tables & relationships you must understand / own (coordinate shared tables):** camp_organizers, donation_camps, camp_target_areas, camp_registrations, camp_checkins, locations, notifications, event_outbox/scheduled_jobs (NEW proposed, not in v2).

**SQL operations/constraints to implement:** sp_approve_donation_camp, sp_record_camp_checkin, fn_camps_in_district, fn_camp_target_donor_ids, trg_check_camp_registration; correct NULL DS uniqueness; capacity locking, idempotent registration/check-in; outbox transaction and scheduled reminders (optional, requires design approval).

**Named views/functions/procedures/triggers:** v_public_donation_camps; v_camp_registration_summary; v_camp_attendance_progress; sp_approve_donation_camp; sp_record_camp_checkin; fn_camp_target_donor_ids; trg_check_camp_registration; sp_enqueue_camp_reminders (NEW OPTIONAL).

**Key advanced concepts you must explain:** Procedure, capacity trigger with lock, race conditions, partial/NULL-aware uniqueness, views, targeting function, optional event queue and scheduled jobs.

**Expected file areas:** `backend/src/routes/camps.js; backend/src/routes/camp-notifications.js; backend/src/workers/outbox-worker.js (NEW optional); frontend/src/pages/Camps/*; frontend/src/pages/Bank/Camps/*; database/migrations/017_camps_events.sql if needed`.

**Migration constraints:** New v2 scripts are NOT yet in `dev`; first integrate the reviewed `011_domain_extensions.sql`, `012_advanced_workflows.sql`, `013_reporting_objects.sql` in the correct order. A current `010_runtime_privileges.sql` exists. Coordinate with Member 1, who allocates new migration version numbers; DO NOT edit executed migrations or duplicate objects.

## Phase 3 — Backend APIs and integration

Implement/document these **owned routes** (existing routes must remain compatible; proposed routes marked in shared contract):

GET /api/v1/camps (existing); GET /api/v1/camps/:id (existing); POST /api/v1/camps (existing); POST /api/v1/camps/:id/submit (existing); POST /api/v1/camps/:id/approve (existing); GET/POST /api/v1/camps/:id/target-areas; POST /api/v1/camps/:id/registrations (existing); GET /api/v1/camps/:id/registrations (staff only); POST /api/v1/camps/:id/checkins; PATCH /api/v1/camps/:id/cancel; GET /api/v1/donors/me/camps.

Each route needs Zod validation, parameterized SQL, JWT, role authorization, institution membership checks, stable errors, pagination when listing, and testable DB operations. Every multi-step write uses `inTransaction` on a single `pg` connection; `CALL` procedures do not COMMIT internally. Update OpenAPI and `docs/API_IMPLEMENTED.md` only when actually implemented.

## Exact function → API → SQL → frontend ownership table

| Handler function | Method + `/api/v1` route | Authorized role | Inputs | SQL objects | Connected frontend |
|---|---|---|---|---|---|
| `listApprovedCamps` | `GET /camps` | Public | districtCode,dsCode,dateFrom | v_public_donation_camps | CampFinder |
| `getPublicCamp` | `GET /camps/:id` | Public | camp UUID | v_public_donation_camps | CampDetail |
| `createCampDraft` | `POST /camps` | BANK_STAFF assigned bank | title,organizerId,bankId,locationId,startsAt,endsAt,capacity | donation_camps DRAFT | NewCampWizard |
| `submitCamp` | `POST /camps/:id/submit` | BANK_STAFF assigned bank | camp UUID | donation_camps DRAFT→PENDING | SubmitCampDialog |
| `approveCamp` | `POST /camps/:id/approve` | BANK_STAFF assigned verified bank | camp UUID | sp_approve_donation_camp | CampApprovalPanel |
| `setCampTargets` | `POST /camps/:id/target-areas` | BANK_STAFF assigned bank | districtCode,dsCode?,radiusKm? | camp_target_areas + NULL DS uniqueness | CampTargetAreaPicker |
| `getCampTargets` | `GET /camps/:id/target-areas` | BANK_STAFF assigned bank | camp UUID | camp_target_areas | CampTargetAreaTable |
| `registerForCamp` | `POST /camps/:id/registrations` | DONOR | camp UUID | camp_registrations capacity trigger | RegisterCampButton |
| `listCampRegistrations` | `GET /camps/:id/registrations` | BANK_STAFF assigned bank | page,status | camp_registrations scoped join | CampAttendanceTable |
| `checkInCampDonor` | `POST /camps/:id/checkins` | BANK_STAFF assigned bank | registrationId | sp_record_camp_checkin | CampCheckinForm |
| `cancelCamp` | `PATCH /camps/:id/cancel` | BANK_STAFF assigned bank | reason | donation_camps status + audit transaction | CancelCampDialog |
| `myCampRegistrations` | `GET /donors/me/camps` | DONOR | page,status | camp_registrations donor profile join | MyCampRegistrations |

**Named handler functions are proposed implementation contracts**, not claims that JavaScript functions already exist. Add backend route handlers/services with these names or document a reviewed equivalent.

## Exact page/form/navigation map

| Route | Page component | Forms / controls | Navigation entry | Next action |
|---|---|---|---|---|
| `#/camps` | CampFinder | province,district,DS,date | Public navbar Find Camps | camp card→detail |
| `#/camps/:id` | CampDetails | venue,bank,capacity,register | Camp Finder | signed-out→Login with return path |
| `#/donor/camps/registrations` | MyCampRegistrations | status,cancel if allowed | Donor sidebar My Camps | details |
| `#/bank/camps` | BankCamps | draft/pending/approved filters | Bank sidebar Camps | New camp or detail |
| `#/bank/camps/new` | CampWizard | name,organizer,venue,dates,capacity,target areas | Bank Camps New | saved draft→submit |
| `#/bank/camps/:id/approval` | CampApproval | verify staff/bank,confirm | Bank camp detail | approval→public |
| `#/bank/camps/:id/checkins` | CampCheckin | attendee,registrationId,checkin | Bank camp detail | attendance totals |

## Phase 4 — Responsive frontend pages, forms, and navigation

**Pages/screens to build:** Public /camps, /camps/:id; Donor /donor/camps/registrations; Bank /bank/camps, /bank/camps/new, /bank/camps/:id, /bank/camps/:id/registrations, /bank/camps/:id/checkins, /bank/camps/:id/approval.

**Forms and fields:** Finder: province/district/DS/date filter; camp: title, organizer, coordinating bank, location/venue, start/end times, capacity, contact, area targets; approval review; registration confirm; check-in form; cancellation reason; notification preference.

**Navigation and role guards:** Landing → Find Camps → Camp Details → Sign in/Registration; donor dashboard → My Camps; bank dashboard → Camps → Draft → Submit → Review/Approve → Attendees/Check-ins.

Responsive requirements: phone 390px, tablet 768px, desktop 1440px. Include loading, empty, validation and server error states; accessible focus states, labels, touch-friendly controls and keyboard paths. Reuse navy/red public theme and light role dashboards. Current application uses hash routing; do not install a second router without Member 1 integration approval.

## Phase 5 — Test cases you OWN

| Test ID | Priority | Layer | Scenario / action | Expected result |
|---|---|---|---|---|
| M5-001 | P0 | DB | Camp ends before it starts | CHECK rejects |
| M5-002 | P0 | DB | Camp capacity 0 or negative | CHECK rejects |
| M5-003 | P0 | DB | Unverified or unrelated bank tries approval | Procedure rejects, status PENDING remains |
| M5-004 | P0 | DB | Bank staff approves own verified pending camp | Status APPROVED and audit row |
| M5-005 | P0 | DB | Attempt approval of DRAFT/APPROVED/CANCELLED | Rejected without changing state |
| M5-006 | P0 | DB | Camp start time passed before approval | Reject approval |
| M5-007 | P0 | DB | Pending camp published in public view | Excluded |
| M5-008 | P0 | DB | Approved future camp published | Public view includes venue but no donor records |
| M5-009 | P0 | DB | Duplicate district-wide target with ds_code NULL | Second insert rejected |
| M5-010 | P0 | DB | Target DS not part of target district | FK rejects |
| M5-011 | P0 | DB | Opted-in donor same district/DS | Included in target function |
| M5-012 | P0 | DB | Opted-out donor same area | Excluded immediately |
| M5-013 | P0 | DB | No camp targets defined | Return no targeted donor IDs |
| M5-014 | P1 | DB | Approved upcoming camp has open capacity | One donor registration succeeds |
| M5-015 | P1 | DB | Pending or cancelled camp registration | Trigger rejects |
| M5-016 | P1 | DB | Donor registers same camp twice | Unique constraint rejects or idempotent existing |
| M5-017 | P1 | DB | Camp capacity exactly full | Next insert rejected |
| M5-018 | P0 | DB | Two people try final camp place simultaneously | One succeeds, no overcapacity |
| M5-019 | P1 | DB | Donor cancels registration | Status cancellation and capacity reusable |
| M5-020 | P1 | DB | Re-register cancelled registration | Defined reactivation path, no second unique row |
| M5-021 | P1 | DB | Authorized check-in during time window | One attendance and one check-in persisted |
| M5-022 | P1 | DB | Check-in outside allowed time window | Reject, unchanged registration |
| M5-023 | P1 | DB | Wrong bank scans check-in | Permission denied |
| M5-024 | P1 | DB | Duplicate check-in request | No duplicate check-in; idempotent or 409 |
| M5-025 | P1 | DB | Attendance count vs actual donation count | Separate counts and tables |
| M5-026 | P2 | DB | Camp reminder queued before scheduled date | One outbox row per user/camp/reminder kind |
| M5-027 | P2 | DB | Worker claims same job twice concurrently | Only one lease; SKIP LOCKED or alternative |
| M5-028 | P2 | DB | Notification fails delivery | Retry with bounded backoff, do not lose event |
| M5-029 | P2 | DB | Worker crashed during processing | Lease expiry allows safe retry, idempotency prevents duplicate delivery |
| M5-030 | P2 | DB | Donor withdraws opt-in before delivery | Skip delivery and record suppression |
| M5-031 | P0 | API | District/DS camp filter | Only approved relevant future camps |
| M5-032 | P0 | API | Create draft bank staff with valid bank ownership | 201 DRAFT |
| M5-033 | P0 | API | Create draft by donor | 403 |
| M5-034 | P0 | API | Submit draft belonging to own bank | 200 PENDING |
| M5-035 | P0 | API | Approve unrelated bank camp | 403 and audit unchanged |
| M5-036 | P0 | API | Register logged-in donor | 201 and own registration |
| M5-037 | P0 | API | Anonymous POST registration | 401 |
| M5-038 | P0 | API | Get attendee list as donor | 403 and no private list |
| M5-039 | P1 | API | Check-in as bank staff during allowed window | 200 and status ATTENDED |
| M5-040 | P1 | API | Cancel approved camp as coordinating staff | 200 CANCELLED, public listing excluded |
| M5-041 | P0 | UI | District/DS/date filters change results | API-backed listing + clear reset |
| M5-042 | P0 | UI | No approved camps in selected area | Empty state, no fake live event |
| M5-043 | P0 | UI | Camp detail shows time in Asia/Colombo and venue | Correct time zone and bank identification |
| M5-044 | P0 | UI | Signed-out donor clicks Register | Taken to login and returned to camp detail |
| M5-045 | P1 | UI | Logged-in donor registers successful | Confirmation shown, action not duplicated |
| M5-046 | P1 | UI | New camp form missing title/venue/date | Field errors; no API call |
| M5-047 | P1 | UI | Changing district clears DS/GN selections | Dependent inputs reset |
| M5-048 | P1 | UI | Bank approvals page displays pending camps | Correct own-bank records, approve/reject confirmation |
| M5-049 | P1 | UI | Check-in action shows attendee status | No duplicate action after confirmed |
| M5-050 | P1 | UI | 390px camp detail and form | Single-column accessible layout, no overflow |
| M5-051 | P0 | E2E | Draft→Submit→Approve→Public→Register→Check-in | Correct transitions and attendance audit |
| M5-052 | P0 | E2E | Cancelled camp hidden and cannot accept new registrations | No invitation or seat granted |

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

M1 LocationSelector, verified bank; M2 consent; M4 camp donation linking; M6 camp reports; no SMS/cloud worker required for Friday core unless remaining time.

**Viva requirement:** complete ALL shared advanced DB labs in `docs/05_ALL_MEMBER_ADVANCED_DB_PRACTICAL.md`, not only this module's SQL.

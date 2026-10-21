# Member 3 — Hospital Blood Requests & Request Progress

**Dedicated branch:** `feature/m3-hospital-requests` · **PR base:** `dev` · **Priority:** P0 tests before P1 enhancements.

## Phase 0 — Git branch creation (MANDATORY)

```bash
git status --short                   # If non-empty, commit/stash YOUR current work safely
 git fetch origin --prune            # MUST fetch latest dev before branching
 git switch -c feature/m3-hospital-requests origin/dev
 git status -sb                       # Confirm your feature branch, not dev/main
 # FIRST write your module tests; run and record expected RED failure
 # THEN implement DB/API/UI; run targeted tests until GREEN
 git add -p                           # Stage only your module changes, review patch interactively
 git commit -m "feat(m3): implement hospital-requests with TDD"
 git push -u origin feature/m3-hospital-requests
 # GitHub PR: HEAD=feature/m3-hospital-requests BASE=dev (never main), request DB lead + dependent member review
```

If feature branch already exists locally, `git switch feature/m3-hospital-requests; git fetch origin --prune; git rebase origin/dev` **only if your branch isn't shared/reviewed**; otherwise coordinate merges with the team. Never reset or force push `dev`. Keep `main` untouched (unrelated history).

## Phase 1 — Create ALL module test cases FIRST

- Test IDs assigned: **40 module-specific scenarios** plus **45 shared cases**.
- Start by copying/writing tests in a new file, e.g. `backend/test/m3-hospital-requests.test.js` and `frontend/src/pages/.../*.test.jsx`. Use `node:test`+Supertest+pg and Vitest+Testing Library.
- Tests with a new endpoint/SQL object should fail for the **correct missing behavior** before implementation. Record RED output in your PR.
- Never merge failing tests to `dev`; do NOT consider `test.todo` passing coverage. Implement real checks for every P0 case.
- Allocate a dedicated disposable PostgreSQL DB; use unique synthetic email/UUID fixtures.

## Phase 2 — Database design and advanced objects

**Tables & relationships you must understand / own (coordinate shared tables):** blood_requests, request_items, request_status_events, donor_matches (read), fulfillments (read), v_request_received_progress.

**SQL operations/constraints to implement:** Request header + lines one atomic transaction; fn_request_remaining_units(request_item_id) (NEW); v_hospital_request_queue and v_request_received_progress; status transition trigger; authorized read scopes; index hospital/status/time; cancellation business rules.

**Named views/functions/procedures/triggers:** v_hospital_request_queue; v_request_received_progress; trg_request_history; fn_request_remaining_units (NEW); sp_cancel_blood_request (NEW after lifecycle review).

**Key advanced concepts you must explain:** Atomic multi-row insert, FK/CHECK, views, aggregate GROUP BY, CTE/window queries, triggers, rollback, locking and indexes.

**Expected file areas:** `backend/src/routes/requests.js; backend/src/routes/request-items.js (new); frontend/src/pages/Hospital/*; database/migrations/015_request_workflow.sql if needed`.

**Migration constraints:** New v2 scripts are NOT yet in `dev`; first integrate the reviewed `011_domain_extensions.sql`, `012_advanced_workflows.sql`, `013_reporting_objects.sql` in the correct order. A current `010_runtime_privileges.sql` exists. Coordinate with Member 1, who allocates new migration version numbers; DO NOT edit executed migrations or duplicate objects.

## Phase 3 — Backend APIs and integration

Implement/document these **owned routes** (existing routes must remain compatible; proposed routes marked in shared contract):

GET/POST /api/v1/requests (existing, augment); GET /api/v1/requests/:id; GET /api/v1/requests/:id/progress; PATCH /api/v1/requests/:id/cancel; GET /api/v1/requests/:id/items; GET /api/v1/requests/:id/fulfillments.

Each route needs Zod validation, parameterized SQL, JWT, role authorization, institution membership checks, stable errors, pagination when listing, and testable DB operations. Every multi-step write uses `inTransaction` on a single `pg` connection; `CALL` procedures do not COMMIT internally. Update OpenAPI and `docs/API_IMPLEMENTED.md` only when actually implemented.

## Exact function → API → SQL → frontend ownership table

| Handler function | Method + `/api/v1` route | Authorized role | Inputs | SQL objects | Connected frontend |
|---|---|---|---|---|---|
| `listHospitalRequests` | `GET /requests` | HOSPITAL_STAFF | status,urgency,page,dateFrom,dateTo | v_hospital_request_queue scoped membership | HospitalRequestList |
| `createHospitalRequest` | `POST /requests` | HOSPITAL_STAFF | hospitalId,urgency,neededBy,items[] | blood_requests + request_items atomic tx | NewBloodRequestForm |
| `getRequestDetail` | `GET /requests/:id` | HOSPITAL_STAFF scoped | UUID | blood_requests + request_items + membership | RequestDetails |
| `getRequestProgress` | `GET /requests/:id/progress` | Authorized hospital/bank scoped | UUID | v_request_received_progress | RequestProgressTimeline |
| `listRequestItems` | `GET /requests/:id/items` | Authorized hospital/bank scoped | UUID | request_items | RequestItemsTable |
| `getRequestFulfillments` | `GET /requests/:id/fulfillments` | Authorized hospital/bank scoped | UUID | fulfillments + fulfillment_units | RequestFulfillments |
| `cancelBloodRequest` | `PATCH /requests/:id/cancel` | HOSPITAL_STAFF scoped | reason | sp_cancel_blood_request proposed, coordinated with M4 | CancelRequestDialog |

**Named handler functions are proposed implementation contracts**, not claims that JavaScript functions already exist. Add backend route handlers/services with these names or document a reviewed equivalent.

## Exact page/form/navigation map

| Route | Page component | Forms / controls | Navigation entry | Next action |
|---|---|---|---|---|
| `#/hospital/requests` | RequestList | filters urgency,status,date | Hospital sidebar Requests | new form / row detail |
| `#/hospital/requests/new` | BloodRequestWizard | hospital,urgency,neededBy,notes,dynamic item rows | New Request CTA | submit→detail |
| `#/hospital/requests/:id` | BloodRequestDetails | header,items,progress,cancel modal | Request row | progress and fulfillment receipt |
| `#/hospital/requests/:id/progress` | BloodRequestProgress | reserved/dispatched/received timeline | Request detail tab | realtime refresh |

## Phase 4 — Responsive frontend pages, forms, and navigation

**Pages/screens to build:** Hospital /hospital/dashboard, /hospital/requests, /hospital/requests/new, /hospital/requests/:id, /hospital/requests/:id/progress.

**Forms and fields:** New request: hospital identity from authorized membership (not user-selectable arbitrary hospital), urgency, needed-by, notes, dynamic rows for blood group, component and units; request filter: urgency/status/date; cancel confirmation with reason.

**Navigation and role guards:** Hospital dashboard → Requests → New Request → Details → Progress; detail → candidate search (M2) and receipts (M4); mobile back navigation and status breadcrumbs.

Responsive requirements: phone 390px, tablet 768px, desktop 1440px. Include loading, empty, validation and server error states; accessible focus states, labels, touch-friendly controls and keyboard paths. Reuse navy/red public theme and light role dashboards. Current application uses hash routing; do not install a second router without Member 1 integration approval.

## Phase 5 — Test cases you OWN

| Test ID | Priority | Layer | Scenario / action | Expected result |
|---|---|---|---|---|
| M3-001 | P0 | DB | Request with 2 item lines created atomically | Header and exactly 2 lines committed |
| M3-002 | P0 | DB | Second line fails CHECK constraint | Header and first line fully rolled back |
| M3-003 | P0 | DB | Request with no items | Invalid, no header persisted |
| M3-004 | P0 | DB | Item requested units 0 or negative | CHECK rejects |
| M3-005 | P0 | DB | Invalid blood type code | FK rejects |
| M3-006 | P0 | DB | Unknown component code | FK rejects |
| M3-007 | P0 | DB | Request missing institution membership | No request created |
| M3-008 | P0 | DB | Status transitions OPEN→PARTIALLY_FILLED→FULFILLED | Allowed changes tracked in request_status_events |
| M3-009 | P1 | DB | Cancel after received/fulfilled | Reject according to transition rules, no corruption |
| M3-010 | P1 | DB | Request notes contain SQL injection string | Stored literal value via parameters, no commands executed |
| M3-011 | P1 | DB | Queue aggregates multiple request lines | One row per request with correct item count & units |
| M3-012 | P1 | DB | Received-progress view with 2 active reservations | Reserved=2, received=0 |
| M3-013 | P1 | DB | Received-progress view with 1 dispatched unit | Dispatched=1, received=0 |
| M3-014 | P1 | DB | Received-progress view after 1 receipt | Received=1, not double counted |
| M3-015 | P1 | DB | Request status trigger on unchanged state | No spurious status event |
| M3-016 | P0 | API | Hospital staff creates valid request | 201 and request identifier |
| M3-017 | P0 | API | Hospital staff creates request with past neededBy | 400 with validation |
| M3-018 | P0 | API | Hospital staff submits urgency outside enum | 400 with field error |
| M3-019 | P0 | API | Hospital staff submits 101 units in one line | 400 per 1–100 current contract |
| M3-020 | P0 | API | Hospital staff submits 11 lines | 400 per max 10 current contract |
| M3-021 | P0 | API | Donor calls POST requests | 403 |
| M3-022 | P0 | API | Hospital A user uses hospitalId of Hospital B | 403, no side effect |
| M3-023 | P0 | API | List requests with hospital membership | Only allowed institution(s) |
| M3-024 | P0 | API | GET request detail valid authorized ID | 200, header+items+status |
| M3-025 | P0 | API | GET unknown request UUID | 404 |
| M3-026 | P1 | API | GET malformed request UUID | 400 |
| M3-027 | P1 | API | GET request from another hospital | 403/404, never leaks data |
| M3-028 | P1 | API | GET progress after partial dispatch | Correct reserved/dispatched/received totals |
| M3-029 | P1 | API | Cancel open request as originating hospital staff | 200, status event written, future reservations blocked |
| M3-030 | P1 | API | Cancel fulfilled request | 409, status unchanged |
| M3-031 | P0 | UI | Add/remove request lines | Inputs independent and totals recompute |
| M3-032 | P0 | UI | Submit with no line | Validation and field focus, no request |
| M3-033 | P0 | UI | Submit valid request | Navigates to newly created detail page |
| M3-034 | P0 | UI | Network failure while submit | Preserve draft and show retry, no duplicate on reattempt |
| M3-035 | P1 | UI | Filter/sort by urgency and status | Search updates real API-backed rows |
| M3-036 | P1 | UI | Progress timeline differentiates reserved/issued/received | Accurate status labels |
| M3-037 | P1 | UI | Direct URL to hospital dashboard as donor | Access denied and no sensitive content |
| M3-038 | P1 | UI | 390px dynamic request form and list | No clipped fields or horizontal scroll page |
| M3-039 | P0 | E2E | Create request→view listing/details/progress | Consistent IDs and quantities |
| M3-040 | P0 | E2E | Cancel request then try reserve unit | Rejected with consistent state |

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

M1 membership; M4 allocation vs dispatched vs received states; M2 candidate API; agree lifecycle semantics before adding status fields.

**Viva requirement:** complete ALL shared advanced DB labs in `docs/05_ALL_MEMBER_ADVANCED_DB_PRACTICAL.md`, not only this module's SQL.

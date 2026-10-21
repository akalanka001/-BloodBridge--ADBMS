# Member 4 — Donation Processing, Blood Unit Inventory & Fulfillment

**Dedicated branch:** `feature/m4-inventory-fulfillment` · **PR base:** `dev` · **Priority:** P0 tests before P1 enhancements.

## Phase 0 — Git branch creation (MANDATORY)

```bash
git status --short                   # If non-empty, commit/stash YOUR current work safely
 git fetch origin --prune            # MUST fetch latest dev before branching
 git switch -c feature/m4-inventory-fulfillment origin/dev
 git status -sb                       # Confirm your feature branch, not dev/main
 # FIRST write your module tests; run and record expected RED failure
 # THEN implement DB/API/UI; run targeted tests until GREEN
 git add -p                           # Stage only your module changes, review patch interactively
 git commit -m "feat(m4): implement inventory-fulfillment with TDD"
 git push -u origin feature/m4-inventory-fulfillment
 # GitHub PR: HEAD=feature/m4-inventory-fulfillment BASE=dev (never main), request DB lead + dependent member review
```

If feature branch already exists locally, `git switch feature/m4-inventory-fulfillment; git fetch origin --prune; git rebase origin/dev` **only if your branch isn't shared/reviewed**; otherwise coordinate merges with the team. Never reset or force push `dev`. Keep `main` untouched (unrelated history).

## Phase 1 — Create ALL module test cases FIRST

- Test IDs assigned: **55 module-specific scenarios** plus **45 shared cases**.
- Start by copying/writing tests in a new file, e.g. `backend/test/m4-inventory-fulfillment.test.js` and `frontend/src/pages/.../*.test.jsx`. Use `node:test`+Supertest+pg and Vitest+Testing Library.
- Tests with a new endpoint/SQL object should fail for the **correct missing behavior** before implementation. Record RED output in your PR.
- Never merge failing tests to `dev`; do NOT consider `test.todo` passing coverage. Implement real checks for every P0 case.
- Allocate a dedicated disposable PostgreSQL DB; use unique synthetic email/UUID fixtures.

## Phase 2 — Database design and advanced objects

**Tables & relationships you must understand / own (coordinate shared tables):** donations, donation_screenings, blood_units, blood_unit_release_events, inventory_movements, stock_thresholds, inventory_reservations, fulfillments, fulfillment_units, fulfillment_status_events.

**SQL operations/constraints to implement:** sp_release_blood_unit, existing fn_reserve_blood_unit, sp_cancel_reservation, fn_attach_reserved_unit_to_fulfillment, sp_dispatch_fulfillment, sp_confirm_fulfillment_receipt; stock/shortage views; row locking; no oversubscription or duplicate issuance; audit triggers.

**Named views/functions/procedures/triggers:** v_available_blood_stock (existing); v_stock_below_threshold; trg_validate_unit_source, trg_release_history, trg_log_blood_unit_status, trg_fulfillment_unit_integrity; transactional functions/procedures named above.

**Key advanced concepts you must explain:** Procedures vs functions, BEFORE/AFTER triggers, ACID, isolation, FOR UPDATE, unique partial indexes, actor auditing, rollback, multi-client concurrency tests.

**Expected file areas:** `backend/src/routes/inventory.js; backend/src/routes/donations.js; backend/src/routes/units.js; backend/src/routes/fulfillments.js; frontend/src/pages/Bank/*; frontend/src/pages/Hospital/Receipt*; database/migrations/016_inventory_fulfillment.sql if needed`.

**Migration constraints:** New v2 scripts are NOT yet in `dev`; first integrate the reviewed `011_domain_extensions.sql`, `012_advanced_workflows.sql`, `013_reporting_objects.sql` in the correct order. A current `010_runtime_privileges.sql` exists. Coordinate with Member 1, who allocates new migration version numbers; DO NOT edit executed migrations or duplicate objects.

## Phase 3 — Backend APIs and integration

Implement/document these **owned routes** (existing routes must remain compatible; proposed routes marked in shared contract):

POST /api/v1/donations; POST /api/v1/donations/:id/screening; POST /api/v1/units; POST /api/v1/units/:id/release; GET /api/v1/inventory/summary (existing); GET /api/v1/inventory/units; GET /api/v1/inventory/shortages; POST /api/v1/inventory/reservations (existing); POST /api/v1/inventory/reservations/:id/cancel; POST /api/v1/fulfillments; POST /api/v1/fulfillments/:id/units; POST /api/v1/fulfillments/:id/dispatch; POST /api/v1/fulfillments/:id/receive.

Each route needs Zod validation, parameterized SQL, JWT, role authorization, institution membership checks, stable errors, pagination when listing, and testable DB operations. Every multi-step write uses `inTransaction` on a single `pg` connection; `CALL` procedures do not COMMIT internally. Update OpenAPI and `docs/API_IMPLEMENTED.md` only when actually implemented.

## Exact function → API → SQL → frontend ownership table

| Handler function | Method + `/api/v1` route | Authorized role | Inputs | SQL objects | Connected frontend |
|---|---|---|---|---|---|
| `createDonation` | `POST /donations` | BANK_STAFF assigned bank | donorId,bloodBankId,campId?,collectedAt | donations transaction | DonationCollectionForm |
| `recordDonationScreening` | `POST /donations/:id/screening` | BANK_STAFF assigned bank | resultStatus,performedAt | donation_screenings audit | ScreeningForm |
| `createComponentUnit` | `POST /units` | BANK_STAFF assigned bank | donationId,type,component,expiresAt | blood_units lineage/source trigger | NewUnitForm |
| `releaseComponentUnit` | `POST /units/:id/release` | BANK_STAFF assigned bank | confirmation | sp_release_blood_unit | UnitReleaseDialog |
| `listInventoryUnits` | `GET /inventory/units` | Assigned bank staff | bloodType,component,status,expiry,page | blood_units filter, partial index | BloodUnitTable |
| `getInventorySummary` | `GET /inventory/summary` | Scoped staff | bloodBankId allowed | v_available_blood_stock | BankSummaryCards |
| `getStockShortages` | `GET /inventory/shortages` | Bank staff/ADMIN | bankId,component | v_stock_below_threshold | StockShortageAlerts |
| `reserveComponentUnit` | `POST /inventory/reservations` | BANK_STAFF | requestItemId,bloodUnitId | fn_reserve_blood_unit explicit transaction | ReserveUnitDialog |
| `cancelInventoryReservation` | `POST /inventory/reservations/:id/cancel` | BANK_STAFF | reason | sp_cancel_reservation | CancelReservationDialog |
| `createFulfillment` | `POST /fulfillments` | BANK_STAFF | requestId,bloodBankId | fulfillments PREPARING | CreateFulfillmentForm |
| `attachUnitToFulfillment` | `POST /fulfillments/:id/units` | BANK_STAFF | reservationId | fn_attach_reserved_unit_to_fulfillment | FulfillmentUnitPicker |
| `dispatchFulfillment` | `POST /fulfillments/:id/dispatch` | BANK_STAFF | confirmation | sp_dispatch_fulfillment | DispatchDialog |
| `confirmFulfillmentReceipt` | `POST /fulfillments/:id/receive` | HOSPITAL_STAFF assigned hospital | confirmation | sp_confirm_fulfillment_receipt | HospitalReceiptForm |

**Named handler functions are proposed implementation contracts**, not claims that JavaScript functions already exist. Add backend route handlers/services with these names or document a reviewed equivalent.

## Exact page/form/navigation map

| Route | Page component | Forms / controls | Navigation entry | Next action |
|---|---|---|---|---|
| `#/bank/donations/new` | DonationWizard | donor,bank,camp,collection,simulated screening | Bank sidebar Donations | next screen Unit Create |
| `#/bank/units` | UnitInventory | group,component,status,expiry filters | Bank sidebar Inventory | row→Unit detail/release |
| `#/bank/requests` | BankRequestQueue | request filter,available units | Bank sidebar Requests | reserve unit |
| `#/bank/fulfillments/:id` | FulfillmentWizard | attach reservations,dispatch confirm | Reservation success | dispatch and status |
| `#/hospital/fulfillments/:id/receive` | ReceiptConfirmation | dispatched units,confirm | Hospital request progress | after receipt view updated request |

## Phase 4 — Responsive frontend pages, forms, and navigation

**Pages/screens to build:** Blood Bank /bank/dashboard, /bank/donations/new, /bank/units, /bank/units/:id, /bank/requests, /bank/fulfillments/:id; Hospital /hospital/fulfillments/:id/receive.

**Forms and fields:** New donation: donor, bank, camp (optional), collected time; simulated screening decision; component-unit creation with expiry/type; release confirmation; inventory search by type/component/expiry; reservation picker; dispatch review and hospital receipt.

**Navigation and role guards:** Bank dashboard → Donations → Screen → Unit → Release; Bank requests → Reserve → Fulfillment → Dispatch; Hospital request details → Receipt confirmation; mobile grouped tables and status stepper.

Responsive requirements: phone 390px, tablet 768px, desktop 1440px. Include loading, empty, validation and server error states; accessible focus states, labels, touch-friendly controls and keyboard paths. Reuse navy/red public theme and light role dashboards. Current application uses hash routing; do not install a second router without Member 1 integration approval.

## Phase 5 — Test cases you OWN

| Test ID | Priority | Layer | Scenario / action | Expected result |
|---|---|---|---|---|
| M4-001 | P0 | DB | Donation is recorded for valid donor/bank | Linked record created with collected time |
| M4-002 | P0 | DB | Donation from unknown donor or bank | FK rejects |
| M4-003 | P0 | DB | Unit collection time later than expiry | CHECK rejects |
| M4-004 | P0 | DB | Unit release while QUARANTINED without screening | Procedure rejects |
| M4-005 | P0 | DB | Screening decision missing/not passed | Release rejects, no release audit |
| M4-006 | P0 | DB | Release by staff of another bank | Permission failure, no status change |
| M4-007 | P0 | DB | Release once successfully with staff and screening | RELEASED + actor + release history exactly once |
| M4-008 | P0 | DB | Release already released unit | Error/idempotency defined, no duplicate release history |
| M4-009 | P0 | DB | Unit references donation from another bank | Integrity trigger rejects |
| M4-010 | P0 | DB | Expired unit shown as available | Stock view excludes |
| M4-011 | P0 | DB | Quarantined unit shown as available | Stock view excludes |
| M4-012 | P0 | DB | Stock available view count 2 released units | Count matches direct filtered query |
| M4-013 | P0 | DB | Threshold below available stock | Shortage absent |
| M4-014 | P0 | DB | Threshold greater than available stock | Shortage units computed correctly |
| M4-015 | P0 | DB | Reserve released, unexpired in-stock unit | ACTIVE reservation, unit RESERVED, audit inserted |
| M4-016 | P0 | DB | Reserve already reserved unit | Reject, no extra row |
| M4-017 | P0 | DB | Reserve expired unit | Reject, stock unchanged |
| M4-018 | P1 | DB | Reserve quarantined unit | Reject, no active reservation |
| M4-019 | P1 | DB | Reserve wrong component/blood-type unit | Reject, no mutation |
| M4-020 | P1 | DB | Reserve over requested units | Reject, request not overallocated |
| M4-021 | P1 | DB | Reserve from unassigned bank | Permission denied |
| M4-022 | P0 | DB | Two sessions reserve same unit simultaneously | One succeeds, second fails safely |
| M4-023 | P0 | DB | Rollback after unit status update | No reservation or inventory_movement remains |
| M4-024 | P1 | DB | Cancel ACTIVE reservation | Unit returns IN_STOCK when still released/unexpired, history recorded |
| M4-025 | P1 | DB | Cancel FULFILLED reservation | Reject, no return to stock |
| M4-026 | P1 | DB | Attach ACTIVE reservation from matching request/bank | Fulfillment unit link created |
| M4-027 | P1 | DB | Attach reservation belonging to different request | Reject, no link |
| M4-028 | P1 | DB | Attach same blood unit to two fulfillments | Unique constraint rejects |
| M4-029 | P1 | DB | Dispatch PREPARING fulfillment with attached units | Unit ISSUED, reservation FULFILLED and status DISPATCHED |
| M4-030 | P1 | DB | Dispatch fulfillment without any units | Reject, no state change |
| M4-031 | P1 | DB | Dispatch twice | Second attempt rejected or idempotent; no duplicate state event |
| M4-032 | P1 | DB | Hospital receives dispatched fulfillment | RECEIVED status and request progress updated |
| M4-033 | P1 | DB | Wrong hospital attempts receipt | Permission denied |
| M4-034 | P1 | DB | Receive before dispatch | Reject |
| M4-035 | P1 | DB | Cancel issued/dispatched units directly | Prevent invalid stock resurrection |
| M4-036 | P1 | DB | Status update fires movement trigger | Correct previous/current status and actor recorded |
| M4-037 | P0 | API | Bank submits donation and simulated screening | 201 and correct source |
| M4-038 | P0 | API | Unauthenticated/donor submits donation | 401/403 |
| M4-039 | P0 | API | Release endpoint by authorized bank | 200 with updated state |
| M4-040 | P0 | API | Release endpoint by other bank | 403 |
| M4-041 | P0 | API | Bank inventory filters by type/component/expiry | Only assigned bank units returned |
| M4-042 | P0 | API | Admin stock summary without patient data | Safe aggregate output |
| M4-043 | P1 | API | API reserve valid requestItemId and unitId | 201, returns reservation id |
| M4-044 | P1 | API | API reserve malformed UUID | 400 |
| M4-045 | P1 | API | Bank creates and dispatches fulfillment | 201/200, transactional results |
| M4-046 | P1 | API | Hospital confirms own fulfillment | 200 and accurate received totals |
| M4-047 | P0 | UI | Donation form→Screening→Release wizard | Step validations match DB rules |
| M4-048 | P0 | UI | Inventory cards filter/sort/paginate | Only real backend data displayed |
| M4-049 | P0 | UI | Expired/quarantined stock visually distinct | Cannot click Reserve on unavailable unit |
| M4-050 | P0 | UI | Reservation pending/server conflict shown | No optimistic double-reserve, clear retry |
| M4-051 | P1 | UI | Bank dispatch confirmation includes unit details | Action requires confirmation, data matches API |
| M4-052 | P1 | UI | Hospital receive form shows dispatched unit list | Cannot receive wrong institution fulfillment |
| M4-053 | P1 | UI | 390px unit list and wizard | Readable inputs, single column and keyboard access |
| M4-054 | P0 | E2E | Collection→screening→unit release→reservation→dispatch→receipt | No orphan records, correct audit and counts |
| M4-055 | P0 | E2E | Two clients reserve same released unit via API | Only one 201, other 409/400 and no duplicate |

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

M1 bank membership; M2 donor records; M3 request_item_id + hospital approval; M5 camp id optional; use separate DB client transaction for each workflow.

**Viva requirement:** complete ALL shared advanced DB labs in `docs/05_ALL_MEMBER_ADVANCED_DB_PRACTICAL.md`, not only this module's SQL.

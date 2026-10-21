# BloodBridge — MASTER TDD Test Catalog (318 scenarios)

**This is a test-specification artifact written BEFORE new feature implementation.** It is not evidence that tests execute or pass. Existing repository tests remain valid and must be preserved.

P0: sprint blocker. P1: complete where time permits after critical workflows. P2: optional labs/automation. Every P0 scenario must be converted into a real automated assertion or repeatable manual record before the owning feature PR can merge.

Coverage totals: DB 172, API 75, UI 47, end-to-end 18, operations 6; P0 183, P1 118, P2 17.

Preconditions (unless noted): dedicated PostgreSQL 16 test environment, synthetic institution/staff/donor/request/unit/camp records as relevant, clean and isolated fixture setup. User auth in API and UI tests is via synthetic scoped JWT. See fixture guide.

## Shared across all members (45)

| ID | Priority | Layer | Type | Action / scenario | Expected result |
|---|---|---|---|---|---|
| SH-001 | P0 | DB | schema | Baseline migrations apply on fresh PostgreSQL 16 | Every table and stored object created once without SQL errors |
| SH-002 | P0 | DB | schema | V2 migrations apply on baseline plus existing runtime privilege migration 010 | Exactly one recorded version for each migration, no number/name conflict |
| SH-003 | P0 | DB | schema | Rerun migration runner on already-migrated DB | No duplicate objects or rows and no modified baseline migrations |
| SH-004 | P0 | DB | schema | Migration fails halfway | All statements and migration-ledger insert roll back together |
| SH-005 | P0 | DB | schema | Concurrent migration runners | Only one applies each migration and other exits/serializes safely |
| SH-006 | P0 | DB | schema | Migrate populated v1 records to v2 | Existing data remain and new nullable columns/defaults are safe |
| SH-007 | P0 | DB | schema | Warehouse migration targeted at OLTP by mistake | Fail safely with clear deployment guard |
| SH-008 | P0 | DB | schema | SQL object signatures match backend callers | Correct type and argument counts for named procedures/functions |
| SH-009 | P0 | DB | security | Application DB role attempts DROP TABLE | Permission denied and operational data intact |
| SH-010 | P0 | DB | security | Application DB role can read protected donor medical assessments without scoped API | Disallowed according to least-privilege model |
| SH-011 | P0 | DB | security | Role membership revoked while JWT remains valid | Subsequent API access is denied |
| SH-012 | P0 | DB | security | Application attempts SQL injection with quotes and semicolons | Inputs bound as parameters; no extra SQL executes |
| SH-013 | P0 | DB | integrity | Foreign-key references missing bank/hospital/donor | SQLSTATE foreign-key violation; no partial write |
| SH-014 | P0 | DB | integrity | Invalid enumerated state / negative unit quantity | CHECK constraint rejects invalid write |
| SH-015 | P0 | DB | integrity | Unique email / donor one-to-one / duplicate registrations | Only allowed unique rows persist |
| SH-016 | P0 | DB | integrity | Duplicate reservation of same active blood unit | Partial unique index prevents second ACTIVE row |
| SH-017 | P0 | DB | integrity | Camp target district-wide NULL DS duplicated | Fixed partial/NULLS NOT DISTINCT uniqueness blocks duplicates |
| SH-018 | P0 | DB | integrity | Blood component references donation from another bank | Source consistency trigger or constraint blocks write |
| SH-019 | P1 | DB | transaction | One transaction contains successful and invalid updates | All changes roll back; no orphan audit rows |
| SH-020 | P0 | DB | transaction | Two clients reserve same unit simultaneously | At most one succeeds, no deadlock, no double booking |
| SH-021 | P1 | DB | transaction | Two clients register last camp seat | Only one new registration succeeds, capacity never exceeded |
| SH-022 | P1 | DB | transaction | Two opposite unit allocations in parallel | No hanging lock cycle; consistent ordering or deadlock retry |
| SH-023 | P0 | DB | transaction | Rollback after stock-trigger audit insert | Both unit update and audit insert disappear |
| SH-024 | P1 | DB | transaction | Read committed repeatable result expectations documented | Demonstrate isolation differences without assuming snapshot semantics |
| SH-025 | P0 | DB | transaction | Savepoint rollback to before an optional insert | Pre-savepoint changes survive commit, optional row removed |
| SH-026 | P2 | DB | performance | Index experiment 10k vs 100k synthetic rows | Capture real EXPLAIN ANALYZE BUFFERS and sizes |
| SH-027 | P2 | DB | performance | B-tree vs hash on same equality workload | Capture planner/index size results, no universal speed claim |
| SH-028 | P2 | DB | performance | Partial index predicate not satisfied | Planner may avoid that index; results remain correct |
| SH-029 | P2 | DB | performance | Range query after heap CLUSTER | Correct values, record physical-plan before/after |
| SH-030 | P2 | DB | performance | Partition date pruning | EXPLAIN shows relevant partition subset |
| SH-031 | P2 | DB | performance | Materialized view before vs after REFRESH | Snapshot staleness then updated correct counts |
| SH-032 | P1 | DB | data_quality | No synthetic data seeded | Views and APIs return valid empty results, not crashes |
| SH-033 | P1 | DB | data_quality | Null/unknown donor blood group | Donor may save profile but is not auto-matched as known group |
| SH-034 | P0 | E2E | integration | Donor→camp registration→check-in→optional donation | Distinct statuses and count semantics remain correct |
| SH-035 | P0 | E2E | integration | Hospital request→reservation→dispatch→receipt | Requested/reserved/dispatched/received totals reconcile |
| SH-036 | P0 | E2E | integration | Opt-out donor→notification targeting | Opted-out donor never included in target results |
| SH-037 | P0 | E2E | security | Hospital A requests Hospital B data | 403/404 and no cross-institution payload |
| SH-038 | P1 | E2E | security | Bank A attempts Bank B stock mutation | Denied and no state change |
| SH-039 | P1 | E2E | privacy | Public camp listing queried anonymously | No donor IDs, assessments, private address or telephone of donor |
| SH-040 | P0 | OPS | ci | CI on PR against dev | Backend tests, frontend tests, DB integration, build and smoke all run |
| SH-041 | P0 | OPS | ci | Branch PR contains newly introduced failing P0 test | Check fails and PR cannot be merged |
| SH-042 | P0 | OPS | ci | Environment lacks secrets in PR | Temporary synthetic CI credentials only; no real secrets needed |
| SH-043 | P1 | OPS | ci | Feature branch is based on origin/dev | PR base dev, no direct commits to dev/main |
| SH-044 | P1 | OPS | ops | Fresh compose startup and stop | Three services healthy; persistent DB volume retained after normal stop |
| SH-045 | P2 | OPS | ops | Screen reader & keyboard flows | Focus order and accessible labels across major forms |

## Member 1 — Core Architecture, Identity, Institutions & Geography (43)

| ID | Priority | Layer | Type | Action / scenario | Expected result |
|---|---|---|---|---|---|
| M1-001 | P0 | DB | schema | All province and district codes unique | Duplicate administrative code rejected |
| M1-002 | P0 | DB | schema | Location district and DS mismatch | Composite FK rejects mismatch |
| M1-003 | P0 | DB | schema | GN code provided without DS | CHECK rejects invalid location |
| M1-004 | P0 | DB | schema | GN belongs to a different DS | Composite FK rejects mismatch |
| M1-005 | P0 | DB | schema | Null GN supplied | Valid location and donor registration allowed |
| M1-006 | P0 | DB | schema | Invalid coordinate latitude 91 or longitude -181 | CHECK rejects out-of-range values |
| M1-007 | P0 | DB | schema | Latitude provided without longitude | CHECK rejects incomplete coordinates |
| M1-008 | P0 | DB | schema | Duplicate user emails with case variation | Case-insensitive uniqueness per approved contract; no duplicates |
| M1-009 | P1 | DB | security | Membership row links both hospital and blood bank | CHECK rejects ambiguous membership |
| M1-010 | P1 | DB | security | Membership row links neither institution | CHECK rejects invalid membership |
| M1-011 | P1 | DB | security | Assign staff to non-existent institution | FK blocks write |
| M1-012 | P1 | DB | security | Inactive user attempts institution write | 401 or 403 with no change |
| M1-013 | P1 | DB | security | Active admin verifies valid institution | Status change and audit row persist |
| M1-014 | P1 | DB | security | Hospital staff tries admin verification | 403, no status or audit change |
| M1-015 | P1 | DB | security | Bank staff tries other bank organization update | 403, data unchanged |
| M1-016 | P0 | API | auth | Register donor with valid district and password | 201 and exactly one user plus donor; password hashed |
| M1-017 | P0 | API | auth | Register donor with invalid email | 400 with field errors |
| M1-018 | P0 | API | auth | Register donor with short password | 400 with no user created |
| M1-019 | P0 | API | auth | Register donor with duplicate email | 409, no duplicate donor |
| M1-020 | P0 | API | auth | Login valid donor | 200 with access token and correct role |
| M1-021 | P0 | API | auth | Login incorrect password | 401 without revealing account existence |
| M1-022 | P0 | API | auth | Expired/bad-signature JWT | 401 |
| M1-023 | P0 | API | auth | Inactive user JWT | 401 even with otherwise valid token |
| M1-024 | P0 | API | auth | Missing bearer token for admin routes | 401 |
| M1-025 | P1 | API | geo | Districts filtered by province | Only requested province returned |
| M1-026 | P1 | API | geo | DS divisions filtered by district | Only matching district returned |
| M1-027 | P1 | API | geo | GN divisions filtered by DS | Only matching DS returned |
| M1-028 | P1 | API | geo | Unknown parent code | 200 empty list or 404 per documented contract, no 500 |
| M1-029 | P1 | API | institutions | List verified institutions scoped by type/district | Result includes authorized public columns only |
| M1-030 | P1 | API | institutions | Verify unverified institution as admin | 200 and audit row |
| M1-031 | P1 | API | institutions | Create institution missing location | 400 with stable error |
| M1-032 | P1 | API | institutions | Create bank with invalid hospital reference | 400/409; no orphan |
| M1-033 | P2 | API | institutions | Deactivate staff membership | Subsequent access denied immediately |
| M1-034 | P0 | UI | registration | Registration form requires email/password/district | Inline errors and prevented submission |
| M1-035 | P0 | UI | registration | Province changes after district/DS selected | Child selections reset; stale codes not submitted |
| M1-036 | P0 | UI | registration | District changes after DS/GN selected | DS and GN reset |
| M1-037 | P0 | UI | registration | Missing DS dataset for area | Graceful empty state, not permanent spinner |
| M1-038 | P1 | UI | registration | Password visibility toggle | Accessible control, no accidental submit |
| M1-039 | P1 | UI | admin | Staff assignment form loaded by admin | Institution options filtered and save reflects API |
| M1-040 | P0 | UI | admin | Unauthorized visitor opens admin URL directly | No protected records exposed; redirected to login/forbidden |
| M1-041 | P1 | UI | responsive | 390px institution list and forms | No sideways page overflow, keyboard navigable |
| M1-042 | P0 | E2E | login | Donor registers then logs in | Role-specific route and correct persisted profile |
| M1-043 | P0 | E2E | auth | Admin assigns staff to bank then revokes | Authorization changes from allowed to denied |

## Member 2 — Donor Profiles, Availability, Matching & Contact (41)

| ID | Priority | Layer | Type | Action / scenario | Expected result |
|---|---|---|---|---|---|
| M2-001 | P0 | DB | donor | Unknown blood group saved as NULL | Profile valid and matching excludes unknown |
| M2-002 | P0 | DB | donor | Donor created without associated user | FK rejects |
| M2-003 | P0 | DB | donor | Two profiles for same user | Unique constraint rejects |
| M2-004 | P0 | DB | donor | Set contact preference false→true | One availability history event created |
| M2-005 | P0 | DB | donor | Save same preferences twice | No redundant change-event record |
| M2-006 | P0 | DB | donor | Set camp opt-in true→false | Targeting excludes donor immediately |
| M2-007 | P0 | DB | donor | Recent donation within configured interval | Potential-donor function excludes donor without declaring permanent ineligibility |
| M2-008 | P0 | DB | donor | Latest assessment deferred with no end | Exclude from candidate list |
| M2-009 | P0 | DB | donor | Deferred until in past | Candidate may be considered subject to other filters; no auto clinical clearance |
| M2-010 | P1 | DB | donor | Assessment CLEARED_BY_STAFF but opted out | Donor excluded from contact list |
| M2-011 | P1 | DB | donor | District matches but blood type differs | Candidate excluded |
| M2-012 | P1 | DB | donor | Correct type and area and opted in | Candidate included, no diagnosis exposed |
| M2-013 | P1 | DB | donor | Candidate list limit zero/negative/huge | Bounded safe limit per function contract |
| M2-014 | P1 | DB | donor | Same donor matched to same request item twice | Idempotent or conflict; only one match row |
| M2-015 | P1 | DB | donor | Match invitation sent twice on retry | Only one active invitation according to idempotency contract |
| M2-016 | P1 | DB | donor | Accept invitation after cancellation | Rejected, original state unchanged |
| M2-017 | P1 | DB | donor | Donor contact event logged on invitation | Actor, time, request/match and non-sensitive status recorded |
| M2-018 | P0 | API | profile | Donor GET own profile | 200 with own data, no other donor PII |
| M2-019 | P0 | API | profile | Donor PATCH availability/opt-in | 200 and DB history; retry stable |
| M2-020 | P0 | API | profile | Unknown property injected in PATCH | Rejected or ignored safely per documented contract |
| M2-021 | P0 | API | profile | Donor requests other donor ID via URL tampering | 403/404, never returns target |
| M2-022 | P0 | API | history | Donor GET history no donations | 200 empty array, correct total |
| M2-023 | P0 | API | history | Donor GET history with many donations | Stable page order and pagination |
| M2-024 | P0 | API | match | Unauthenticated candidate search | 401 |
| M2-025 | P0 | API | match | Normal donor calls staff-only candidate search | 403 |
| M2-026 | P0 | API | match | Bank staff from unrelated bank searches private request | 403/404, no identity leakage |
| M2-027 | P1 | API | match | Authorized search with blood type and district | 200 safe potential matches with metadata |
| M2-028 | P1 | API | invite | Staff invites eligible potential contact | 201/200, stored invitation + event |
| M2-029 | P1 | API | invite | Staff invites donor without contact consent | 403/409, no notification |
| M2-030 | P1 | API | invite | Invited donor responds ACCEPTED | 200; response belongs to current donor |
| M2-031 | P1 | API | invite | Other donor responds to invitation ID | 403/404 |
| M2-032 | P1 | API | invite | Double response to same invitation | Idempotent same response or conflict documented |
| M2-033 | P0 | UI | profile | Donor profile shows saved preferences | Controls reflect API values after reload |
| M2-034 | P0 | UI | profile | Saving preference fails network | Error shown and previous value restored |
| M2-035 | P0 | UI | history | Donation history loading/empty/error | All three UI states implemented |
| M2-036 | P0 | UI | invitations | Invitation list and detail actions | Accept/decline accessible and visibly persisted |
| M2-037 | P1 | UI | invitations | Donor opted out of contact | UI warns before sending; respects persisted opt-in |
| M2-038 | P1 | UI | candidate | Staff candidate list excludes medical clearance claims | Displays POTENTIAL, not verified eligibility |
| M2-039 | P1 | UI | responsive | 390px donor profile/history/invitations | Forms and cards readable, no x overflow |
| M2-040 | P0 | E2E | donor | Preference toggle→trigger→event history | DB and UI agree on prior/new values |
| M2-041 | P0 | E2E | matching | Opted-out donor never exposed in a fresh search | No unauthorized donor identity in payload |

## Member 3 — Hospital Blood Requests & Request Progress (40)

| ID | Priority | Layer | Type | Action / scenario | Expected result |
|---|---|---|---|---|---|
| M3-001 | P0 | DB | request | Request with 2 item lines created atomically | Header and exactly 2 lines committed |
| M3-002 | P0 | DB | request | Second line fails CHECK constraint | Header and first line fully rolled back |
| M3-003 | P0 | DB | request | Request with no items | Invalid, no header persisted |
| M3-004 | P0 | DB | request | Item requested units 0 or negative | CHECK rejects |
| M3-005 | P0 | DB | request | Invalid blood type code | FK rejects |
| M3-006 | P0 | DB | request | Unknown component code | FK rejects |
| M3-007 | P0 | DB | request | Request missing institution membership | No request created |
| M3-008 | P0 | DB | request | Status transitions OPEN→PARTIALLY_FILLED→FULFILLED | Allowed changes tracked in request_status_events |
| M3-009 | P1 | DB | request | Cancel after received/fulfilled | Reject according to transition rules, no corruption |
| M3-010 | P1 | DB | request | Request notes contain SQL injection string | Stored literal value via parameters, no commands executed |
| M3-011 | P1 | DB | view | Queue aggregates multiple request lines | One row per request with correct item count & units |
| M3-012 | P1 | DB | view | Received-progress view with 2 active reservations | Reserved=2, received=0 |
| M3-013 | P1 | DB | view | Received-progress view with 1 dispatched unit | Dispatched=1, received=0 |
| M3-014 | P1 | DB | view | Received-progress view after 1 receipt | Received=1, not double counted |
| M3-015 | P1 | DB | view | Request status trigger on unchanged state | No spurious status event |
| M3-016 | P0 | API | request | Hospital staff creates valid request | 201 and request identifier |
| M3-017 | P0 | API | request | Hospital staff creates request with past neededBy | 400 with validation |
| M3-018 | P0 | API | request | Hospital staff submits urgency outside enum | 400 with field error |
| M3-019 | P0 | API | request | Hospital staff submits 101 units in one line | 400 per 1–100 current contract |
| M3-020 | P0 | API | request | Hospital staff submits 11 lines | 400 per max 10 current contract |
| M3-021 | P0 | API | request | Donor calls POST requests | 403 |
| M3-022 | P0 | API | request | Hospital A user uses hospitalId of Hospital B | 403, no side effect |
| M3-023 | P0 | API | request | List requests with hospital membership | Only allowed institution(s) |
| M3-024 | P0 | API | detail | GET request detail valid authorized ID | 200, header+items+status |
| M3-025 | P0 | API | detail | GET unknown request UUID | 404 |
| M3-026 | P1 | API | detail | GET malformed request UUID | 400 |
| M3-027 | P1 | API | detail | GET request from another hospital | 403/404, never leaks data |
| M3-028 | P1 | API | progress | GET progress after partial dispatch | Correct reserved/dispatched/received totals |
| M3-029 | P1 | API | cancel | Cancel open request as originating hospital staff | 200, status event written, future reservations blocked |
| M3-030 | P1 | API | cancel | Cancel fulfilled request | 409, status unchanged |
| M3-031 | P0 | UI | form | Add/remove request lines | Inputs independent and totals recompute |
| M3-032 | P0 | UI | form | Submit with no line | Validation and field focus, no request |
| M3-033 | P0 | UI | form | Submit valid request | Navigates to newly created detail page |
| M3-034 | P0 | UI | form | Network failure while submit | Preserve draft and show retry, no duplicate on reattempt |
| M3-035 | P1 | UI | requests | Filter/sort by urgency and status | Search updates real API-backed rows |
| M3-036 | P1 | UI | detail | Progress timeline differentiates reserved/issued/received | Accurate status labels |
| M3-037 | P1 | UI | auth | Direct URL to hospital dashboard as donor | Access denied and no sensitive content |
| M3-038 | P1 | UI | responsive | 390px dynamic request form and list | No clipped fields or horizontal scroll page |
| M3-039 | P0 | E2E | request | Create request→view listing/details/progress | Consistent IDs and quantities |
| M3-040 | P0 | E2E | cancellation | Cancel request then try reserve unit | Rejected with consistent state |

## Member 4 — Donation Processing, Blood Unit Inventory & Fulfillment (55)

| ID | Priority | Layer | Type | Action / scenario | Expected result |
|---|---|---|---|---|---|
| M4-001 | P0 | DB | donation | Donation is recorded for valid donor/bank | Linked record created with collected time |
| M4-002 | P0 | DB | donation | Donation from unknown donor or bank | FK rejects |
| M4-003 | P0 | DB | unit | Unit collection time later than expiry | CHECK rejects |
| M4-004 | P0 | DB | unit | Unit release while QUARANTINED without screening | Procedure rejects |
| M4-005 | P0 | DB | unit | Screening decision missing/not passed | Release rejects, no release audit |
| M4-006 | P0 | DB | unit | Release by staff of another bank | Permission failure, no status change |
| M4-007 | P0 | DB | unit | Release once successfully with staff and screening | RELEASED + actor + release history exactly once |
| M4-008 | P0 | DB | unit | Release already released unit | Error/idempotency defined, no duplicate release history |
| M4-009 | P0 | DB | unit | Unit references donation from another bank | Integrity trigger rejects |
| M4-010 | P0 | DB | unit | Expired unit shown as available | Stock view excludes |
| M4-011 | P0 | DB | unit | Quarantined unit shown as available | Stock view excludes |
| M4-012 | P0 | DB | stock | Stock available view count 2 released units | Count matches direct filtered query |
| M4-013 | P0 | DB | stock | Threshold below available stock | Shortage absent |
| M4-014 | P0 | DB | stock | Threshold greater than available stock | Shortage units computed correctly |
| M4-015 | P0 | DB | reservation | Reserve released, unexpired in-stock unit | ACTIVE reservation, unit RESERVED, audit inserted |
| M4-016 | P0 | DB | reservation | Reserve already reserved unit | Reject, no extra row |
| M4-017 | P0 | DB | reservation | Reserve expired unit | Reject, stock unchanged |
| M4-018 | P1 | DB | reservation | Reserve quarantined unit | Reject, no active reservation |
| M4-019 | P1 | DB | reservation | Reserve wrong component/blood-type unit | Reject, no mutation |
| M4-020 | P1 | DB | reservation | Reserve over requested units | Reject, request not overallocated |
| M4-021 | P1 | DB | reservation | Reserve from unassigned bank | Permission denied |
| M4-022 | P0 | DB | reservation | Two sessions reserve same unit simultaneously | One succeeds, second fails safely |
| M4-023 | P0 | DB | reservation | Rollback after unit status update | No reservation or inventory_movement remains |
| M4-024 | P1 | DB | cancel | Cancel ACTIVE reservation | Unit returns IN_STOCK when still released/unexpired, history recorded |
| M4-025 | P1 | DB | cancel | Cancel FULFILLED reservation | Reject, no return to stock |
| M4-026 | P1 | DB | fulfillment | Attach ACTIVE reservation from matching request/bank | Fulfillment unit link created |
| M4-027 | P1 | DB | fulfillment | Attach reservation belonging to different request | Reject, no link |
| M4-028 | P1 | DB | fulfillment | Attach same blood unit to two fulfillments | Unique constraint rejects |
| M4-029 | P1 | DB | fulfillment | Dispatch PREPARING fulfillment with attached units | Unit ISSUED, reservation FULFILLED and status DISPATCHED |
| M4-030 | P1 | DB | fulfillment | Dispatch fulfillment without any units | Reject, no state change |
| M4-031 | P1 | DB | fulfillment | Dispatch twice | Second attempt rejected or idempotent; no duplicate state event |
| M4-032 | P1 | DB | fulfillment | Hospital receives dispatched fulfillment | RECEIVED status and request progress updated |
| M4-033 | P1 | DB | fulfillment | Wrong hospital attempts receipt | Permission denied |
| M4-034 | P1 | DB | fulfillment | Receive before dispatch | Reject |
| M4-035 | P1 | DB | fulfillment | Cancel issued/dispatched units directly | Prevent invalid stock resurrection |
| M4-036 | P1 | DB | audit | Status update fires movement trigger | Correct previous/current status and actor recorded |
| M4-037 | P0 | API | donation | Bank submits donation and simulated screening | 201 and correct source |
| M4-038 | P0 | API | donation | Unauthenticated/donor submits donation | 401/403 |
| M4-039 | P0 | API | unit | Release endpoint by authorized bank | 200 with updated state |
| M4-040 | P0 | API | unit | Release endpoint by other bank | 403 |
| M4-041 | P0 | API | stock | Bank inventory filters by type/component/expiry | Only assigned bank units returned |
| M4-042 | P0 | API | stock | Admin stock summary without patient data | Safe aggregate output |
| M4-043 | P1 | API | reservation | API reserve valid requestItemId and unitId | 201, returns reservation id |
| M4-044 | P1 | API | reservation | API reserve malformed UUID | 400 |
| M4-045 | P1 | API | fulfillment | Bank creates and dispatches fulfillment | 201/200, transactional results |
| M4-046 | P1 | API | fulfillment | Hospital confirms own fulfillment | 200 and accurate received totals |
| M4-047 | P0 | UI | workflow | Donation form→Screening→Release wizard | Step validations match DB rules |
| M4-048 | P0 | UI | stock | Inventory cards filter/sort/paginate | Only real backend data displayed |
| M4-049 | P0 | UI | stock | Expired/quarantined stock visually distinct | Cannot click Reserve on unavailable unit |
| M4-050 | P0 | UI | reservation | Reservation pending/server conflict shown | No optimistic double-reserve, clear retry |
| M4-051 | P1 | UI | fulfillment | Bank dispatch confirmation includes unit details | Action requires confirmation, data matches API |
| M4-052 | P1 | UI | receipt | Hospital receive form shows dispatched unit list | Cannot receive wrong institution fulfillment |
| M4-053 | P1 | UI | responsive | 390px unit list and wizard | Readable inputs, single column and keyboard access |
| M4-054 | P0 | E2E | lifecycle | Collection→screening→unit release→reservation→dispatch→receipt | No orphan records, correct audit and counts |
| M4-055 | P0 | E2E | race | Two clients reserve same released unit via API | Only one 201, other 409/400 and no duplicate |

## Member 5 — Donation Camps, Area Targeting, Check-ins & Scheduled Events (52)

| ID | Priority | Layer | Type | Action / scenario | Expected result |
|---|---|---|---|---|---|
| M5-001 | P0 | DB | camp | Camp ends before it starts | CHECK rejects |
| M5-002 | P0 | DB | camp | Camp capacity 0 or negative | CHECK rejects |
| M5-003 | P0 | DB | camp | Unverified or unrelated bank tries approval | Procedure rejects, status PENDING remains |
| M5-004 | P0 | DB | camp | Bank staff approves own verified pending camp | Status APPROVED and audit row |
| M5-005 | P0 | DB | camp | Attempt approval of DRAFT/APPROVED/CANCELLED | Rejected without changing state |
| M5-006 | P0 | DB | camp | Camp start time passed before approval | Reject approval |
| M5-007 | P0 | DB | camp | Pending camp published in public view | Excluded |
| M5-008 | P0 | DB | camp | Approved future camp published | Public view includes venue but no donor records |
| M5-009 | P0 | DB | target | Duplicate district-wide target with ds_code NULL | Second insert rejected |
| M5-010 | P0 | DB | target | Target DS not part of target district | FK rejects |
| M5-011 | P0 | DB | target | Opted-in donor same district/DS | Included in target function |
| M5-012 | P0 | DB | target | Opted-out donor same area | Excluded immediately |
| M5-013 | P0 | DB | target | No camp targets defined | Return no targeted donor IDs |
| M5-014 | P1 | DB | registration | Approved upcoming camp has open capacity | One donor registration succeeds |
| M5-015 | P1 | DB | registration | Pending or cancelled camp registration | Trigger rejects |
| M5-016 | P1 | DB | registration | Donor registers same camp twice | Unique constraint rejects or idempotent existing |
| M5-017 | P1 | DB | registration | Camp capacity exactly full | Next insert rejected |
| M5-018 | P0 | DB | registration | Two people try final camp place simultaneously | One succeeds, no overcapacity |
| M5-019 | P1 | DB | registration | Donor cancels registration | Status cancellation and capacity reusable |
| M5-020 | P1 | DB | registration | Re-register cancelled registration | Defined reactivation path, no second unique row |
| M5-021 | P1 | DB | checkin | Authorized check-in during time window | One attendance and one check-in persisted |
| M5-022 | P1 | DB | checkin | Check-in outside allowed time window | Reject, unchanged registration |
| M5-023 | P1 | DB | checkin | Wrong bank scans check-in | Permission denied |
| M5-024 | P1 | DB | checkin | Duplicate check-in request | No duplicate check-in; idempotent or 409 |
| M5-025 | P1 | DB | history | Attendance count vs actual donation count | Separate counts and tables |
| M5-026 | P2 | DB | events | Camp reminder queued before scheduled date | One outbox row per user/camp/reminder kind |
| M5-027 | P2 | DB | events | Worker claims same job twice concurrently | Only one lease; SKIP LOCKED or alternative |
| M5-028 | P2 | DB | events | Notification fails delivery | Retry with bounded backoff, do not lose event |
| M5-029 | P2 | DB | events | Worker crashed during processing | Lease expiry allows safe retry, idempotency prevents duplicate delivery |
| M5-030 | P2 | DB | events | Donor withdraws opt-in before delivery | Skip delivery and record suppression |
| M5-031 | P0 | API | camp | District/DS camp filter | Only approved relevant future camps |
| M5-032 | P0 | API | camp | Create draft bank staff with valid bank ownership | 201 DRAFT |
| M5-033 | P0 | API | camp | Create draft by donor | 403 |
| M5-034 | P0 | API | camp | Submit draft belonging to own bank | 200 PENDING |
| M5-035 | P0 | API | camp | Approve unrelated bank camp | 403 and audit unchanged |
| M5-036 | P0 | API | camp | Register logged-in donor | 201 and own registration |
| M5-037 | P0 | API | camp | Anonymous POST registration | 401 |
| M5-038 | P0 | API | camp | Get attendee list as donor | 403 and no private list |
| M5-039 | P1 | API | camp | Check-in as bank staff during allowed window | 200 and status ATTENDED |
| M5-040 | P1 | API | camp | Cancel approved camp as coordinating staff | 200 CANCELLED, public listing excluded |
| M5-041 | P0 | UI | finder | District/DS/date filters change results | API-backed listing + clear reset |
| M5-042 | P0 | UI | finder | No approved camps in selected area | Empty state, no fake live event |
| M5-043 | P0 | UI | details | Camp detail shows time in Asia/Colombo and venue | Correct time zone and bank identification |
| M5-044 | P0 | UI | registration | Signed-out donor clicks Register | Taken to login and returned to camp detail |
| M5-045 | P1 | UI | registration | Logged-in donor registers successful | Confirmation shown, action not duplicated |
| M5-046 | P1 | UI | campform | New camp form missing title/venue/date | Field errors; no API call |
| M5-047 | P1 | UI | campform | Changing district clears DS/GN selections | Dependent inputs reset |
| M5-048 | P1 | UI | approval | Bank approvals page displays pending camps | Correct own-bank records, approve/reject confirmation |
| M5-049 | P1 | UI | checkin | Check-in action shows attendee status | No duplicate action after confirmed |
| M5-050 | P1 | UI | responsive | 390px camp detail and form | Single-column accessible layout, no overflow |
| M5-051 | P0 | E2E | camp | Draft→Submit→Approve→Public→Register→Check-in | Correct transitions and attendance audit |
| M5-052 | P0 | E2E | cancel | Cancelled camp hidden and cannot accept new registrations | No invitation or seat granted |

## Member 6 — Data Warehouse, OLAP, Benchmarking & Integration QA (42)

| ID | Priority | Layer | Type | Action / scenario | Expected result |
|---|---|---|---|---|---|
| M6-001 | P0 | DB | warehouse | Create warehouse schema in separate DB | No warehouse fact tables accidentally created in OLTP |
| M6-002 | P0 | DB | warehouse | Load dimensions before facts | No dangling fact foreign keys |
| M6-003 | P0 | DB | warehouse | Date dimension contains correct year/month/quarter | Date attributes derived correctly including month boundary |
| M6-004 | P0 | DB | warehouse | Location/district dimension mapping | Correct province and district mapping |
| M6-005 | P0 | DB | warehouse | Blood-type and component dimension mapping | Canonical codes and surrogate keys |
| M6-006 | P0 | DB | warehouse | Fact grain for donations one source row each | Unique source donation IDs, correct counts |
| M6-007 | P0 | DB | warehouse | Fact grain for requests one request item each | One unique source request item and correct measures |
| M6-008 | P0 | DB | warehouse | Fact grain for registrations one registration each | No duplication from joins |
| M6-009 | P0 | DB | warehouse | Incremental load after new donation | Only changed/new source rows added |
| M6-010 | P0 | DB | warehouse | Full ETL rerun without source changes | Fact counts unchanged, no duplicates |
| M6-011 | P0 | DB | warehouse | Failed ETL mid-load | Transaction rollback and FAILED metadata records safely captured |
| M6-012 | P1 | DB | warehouse | OLTP donation canceled/corrected after load | Documented update strategy correctly re-syncs derived facts |
| M6-013 | P0 | DB | privacy | Warehouse schema inspected for names/email/phone | No donor personal identifying columns |
| M6-014 | P1 | DB | privacy | Non-admin analytics endpoint called | 403 and no data |
| M6-015 | P1 | DB | analytics | Monthly request materialized view before refresh | Can be stale, timestamps clarify snapshot |
| M6-016 | P1 | DB | analytics | Refresh materialized view after synthetic request | Counts agree with source aggregation |
| M6-017 | P1 | DB | analytics | Materialized view concurrent refresh | Unique index present and refresh succeeds |
| M6-018 | P1 | DB | analytics | Request received vs dispatched counts | Warehouse/analytics never equates dispatched with received |
| M6-019 | P1 | DB | analytics | Zero events in a district/month | 0/empty display not divide by zero or NaN |
| M6-020 | P1 | DB | analytics | SQL aggregation across district/type/component | Totals reconcile to canonical source |
| M6-021 | P2 | DB | performance | B-tree and hash equality benchmark | Real timings and index sizes captured on same synthetic dataset |
| M6-022 | P2 | DB | performance | BRIN on date-ordered historical data | Correct results and explain why effective/ineffective |
| M6-023 | P2 | DB | performance | Heap size vs CLUSTER on disposable table | Capture physical size and plan |
| M6-024 | P2 | DB | performance | Partition pruning on request-date predicate | Only relevant partitions planned/scanned |
| M6-025 | P1 | DB | performance | EXPLAIN ANALYZE without index vs with index | Store actual plan, rows/time/buffers and dataset size |
| M6-026 | P1 | DB | performance | Query planner selects seq scan on tiny table | Explain as valid plan; not assumed failure |
| M6-027 | P0 | API | analytics | GET summary as admin | 200 aggregate JSON, no names/email |
| M6-028 | P0 | API | analytics | GET request trends by date range | Sorted buckets, correct counts |
| M6-029 | P0 | API | analytics | GET request trends by invalid dates | 400 field errors |
| M6-030 | P0 | API | analytics | GET analytics with 1000-year range | Bounded period or rejected |
| M6-031 | P0 | API | analytics | POST ETL refresh as unauthorized user | 403 |
| M6-032 | P0 | API | analytics | POST refresh twice concurrently | One controlled execution or idempotent rescheduling |
| M6-033 | P1 | API | analytics | Benchmark results endpoint | Allowlisted precomputed experiments only, not arbitrary SQL |
| M6-034 | P0 | UI | analytics | Admin dashboard displays real aggregates | Correct units and time window labels |
| M6-035 | P0 | UI | analytics | Charts loading/error/empty | All render without crash |
| M6-036 | P0 | UI | analytics | Date range/district filter changes | Backend request reflected in graph and table |
| M6-037 | P0 | UI | analytics | Refresh button disabled while running | No duplicate request and screen reader status |
| M6-038 | P1 | UI | analytics | Tooltip/legend accessible on keyboard | Information available without mouse |
| M6-039 | P1 | UI | performance | Benchmark chart uses measured not sample values | Dataset/time/units annotated, no fabricated speedup |
| M6-040 | P1 | UI | responsive | 390px admin cards/charts/table | Readable cards, scrollable table, no page overflow |
| M6-041 | P0 | E2E | warehouse | Insert synthetic OLTP data→run ETL→dashboard | Reconciled warehouse aggregate matches UI and source |
| M6-042 | P0 | E2E | warehouse | Run ETL second time→dashboard | No duplicate counts, consistent labels |

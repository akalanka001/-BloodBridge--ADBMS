# Friday, 23 October — Minimum integrated demonstration gate

These 88 cases are selected from the complete 318-case test-first catalog. They are **release-triage priorities**, not a replacement for the remaining full coverage. Each selected case should have a real executable test and captured result.

Tests should be created first (RED), implementation next (GREEN), then full regression. If a case cannot be completed, mark FAIL/NOT DONE and describe why; never mark `test.todo` as PASS.

| Owner | Test ID | Scenario | Expected |
|---|---|---|---|
| Shared | SH-001 | Baseline migrations apply on fresh PostgreSQL 16 | Every table and stored object created once without SQL errors |
| Shared | SH-002 | V2 migrations apply on baseline plus existing runtime privilege migration 010 | Exactly one recorded version for each migration, no number/name conflict |
| Shared | SH-004 | Migration fails halfway | All statements and migration-ledger insert roll back together |
| Shared | SH-020 | Two clients reserve same unit simultaneously | At most one succeeds, no deadlock, no double booking |
| Shared | SH-021 | Two clients register last camp seat | Only one new registration succeeds, capacity never exceeded |
| Shared | SH-013 | Foreign-key references missing bank/hospital/donor | SQLSTATE foreign-key violation; no partial write |
| Shared | SH-016 | Duplicate reservation of same active blood unit | Partial unique index prevents second ACTIVE row |
| Shared | SH-019 | One transaction contains successful and invalid updates | All changes roll back; no orphan audit rows |
| Shared | SH-012 | Application attempts SQL injection with quotes and semicolons | Inputs bound as parameters; no extra SQL executes |
| Shared | SH-037 | Hospital A requests Hospital B data | 403/404 and no cross-institution payload |
| Shared | SH-038 | Bank A attempts Bank B stock mutation | Denied and no state change |
| Shared | SH-040 | CI on PR against dev | Backend tests, frontend tests, DB integration, build and smoke all run |
| M1 | M1-002 | Location district and DS mismatch | Composite FK rejects mismatch |
| M1 | M1-004 | GN belongs to a different DS | Composite FK rejects mismatch |
| M1 | M1-005 | Null GN supplied | Valid location and donor registration allowed |
| M1 | M1-016 | Register donor with valid district and password | 201 and exactly one user plus donor; password hashed |
| M1 | M1-019 | Register donor with duplicate email | 409, no duplicate donor |
| M1 | M1-020 | Login valid donor | 200 with access token and correct role |
| M1 | M1-023 | Inactive user JWT | 401 even with otherwise valid token |
| M1 | M1-027 | GN divisions filtered by DS | Only matching DS returned |
| M1 | M1-014 | Hospital staff tries admin verification | 403, no status or audit change |
| M1 | M1-035 | Province changes after district/DS selected | Child selections reset; stale codes not submitted |
| M1 | M1-036 | District changes after DS/GN selected | DS and GN reset |
| M2 | M2-001 | Unknown blood group saved as NULL | Profile valid and matching excludes unknown |
| M2 | M2-004 | Set contact preference false→true | One availability history event created |
| M2 | M2-006 | Set camp opt-in true→false | Targeting excludes donor immediately |
| M2 | M2-007 | Recent donation within configured interval | Potential-donor function excludes donor without declaring permanent ineligibility |
| M2 | M2-008 | Latest assessment deferred with no end | Exclude from candidate list |
| M2 | M2-011 | District matches but blood type differs | Candidate excluded |
| M2 | M2-019 | Donor PATCH availability/opt-in | 200 and DB history; retry stable |
| M2 | M2-024 | Unauthenticated candidate search | 401 |
| M2 | M2-025 | Normal donor calls staff-only candidate search | 403 |
| M2 | M2-029 | Staff invites donor without contact consent | 403/409, no notification |
| M2 | M2-034 | Saving preference fails network | Error shown and previous value restored |
| M2 | M2-041 | Opted-out donor never exposed in a fresh search | No unauthorized donor identity in payload |
| M3 | M3-001 | Request with 2 item lines created atomically | Header and exactly 2 lines committed |
| M3 | M3-002 | Second line fails CHECK constraint | Header and first line fully rolled back |
| M3 | M3-004 | Item requested units 0 or negative | CHECK rejects |
| M3 | M3-008 | Status transitions OPEN→PARTIALLY_FILLED→FULFILLED | Allowed changes tracked in request_status_events |
| M3 | M3-012 | Received-progress view with 2 active reservations | Reserved=2, received=0 |
| M3 | M3-014 | Received-progress view after 1 receipt | Received=1, not double counted |
| M3 | M3-016 | Hospital staff creates valid request | 201 and request identifier |
| M3 | M3-022 | Hospital A user uses hospitalId of Hospital B | 403, no side effect |
| M3 | M3-024 | GET request detail valid authorized ID | 200, header+items+status |
| M3 | M3-030 | Cancel fulfilled request | 409, status unchanged |
| M3 | M3-033 | Submit valid request | Navigates to newly created detail page |
| M3 | M3-039 | Create request→view listing/details/progress | Consistent IDs and quantities |
| M4 | M4-004 | Unit release while QUARANTINED without screening | Procedure rejects |
| M4 | M4-006 | Release by staff of another bank | Permission failure, no status change |
| M4 | M4-007 | Release once successfully with staff and screening | RELEASED + actor + release history exactly once |
| M4 | M4-009 | Unit references donation from another bank | Integrity trigger rejects |
| M4 | M4-010 | Expired unit shown as available | Stock view excludes |
| M4 | M4-011 | Quarantined unit shown as available | Stock view excludes |
| M4 | M4-015 | Reserve released, unexpired in-stock unit | ACTIVE reservation, unit RESERVED, audit inserted |
| M4 | M4-016 | Reserve already reserved unit | Reject, no extra row |
| M4 | M4-019 | Reserve wrong component/blood-type unit | Reject, no mutation |
| M4 | M4-022 | Two sessions reserve same unit simultaneously | One succeeds, second fails safely |
| M4 | M4-023 | Rollback after unit status update | No reservation or inventory_movement remains |
| M4 | M4-027 | Attach reservation belonging to different request | Reject, no link |
| M4 | M4-029 | Dispatch PREPARING fulfillment with attached units | Unit ISSUED, reservation FULFILLED and status DISPATCHED |
| M4 | M4-032 | Hospital receives dispatched fulfillment | RECEIVED status and request progress updated |
| M4 | M4-034 | Receive before dispatch | Reject |
| M4 | M4-054 | Collection→screening→unit release→reservation→dispatch→receipt | No orphan records, correct audit and counts |
| M5 | M5-001 | Camp ends before it starts | CHECK rejects |
| M5 | M5-004 | Bank staff approves own verified pending camp | Status APPROVED and audit row |
| M5 | M5-007 | Pending camp published in public view | Excluded |
| M5 | M5-009 | Duplicate district-wide target with ds_code NULL | Second insert rejected |
| M5 | M5-012 | Opted-out donor same area | Excluded immediately |
| M5 | M5-014 | Approved upcoming camp has open capacity | One donor registration succeeds |
| M5 | M5-017 | Camp capacity exactly full | Next insert rejected |
| M5 | M5-018 | Two people try final camp place simultaneously | One succeeds, no overcapacity |
| M5 | M5-021 | Authorized check-in during time window | One attendance and one check-in persisted |
| M5 | M5-023 | Wrong bank scans check-in | Permission denied |
| M5 | M5-031 | District/DS camp filter | Only approved relevant future camps |
| M5 | M5-044 | Signed-out donor clicks Register | Taken to login and returned to camp detail |
| M5 | M5-051 | Draft→Submit→Approve→Public→Register→Check-in | Correct transitions and attendance audit |
| M6 | M6-001 | Create warehouse schema in separate DB | No warehouse fact tables accidentally created in OLTP |
| M6 | M6-006 | Fact grain for donations one source row each | Unique source donation IDs, correct counts |
| M6 | M6-010 | Full ETL rerun without source changes | Fact counts unchanged, no duplicates |
| M6 | M6-011 | Failed ETL mid-load | Transaction rollback and FAILED metadata records safely captured |
| M6 | M6-013 | Warehouse schema inspected for names/email/phone | No donor personal identifying columns |
| M6 | M6-014 | Non-admin analytics endpoint called | 403 and no data |
| M6 | M6-016 | Refresh materialized view after synthetic request | Counts agree with source aggregation |
| M6 | M6-020 | SQL aggregation across district/type/component | Totals reconcile to canonical source |
| M6 | M6-025 | EXPLAIN ANALYZE without index vs with index | Store actual plan, rows/time/buffers and dataset size |
| M6 | M6-027 | GET summary as admin | 200 aggregate JSON, no names/email |
| M6 | M6-035 | Charts loading/error/empty | All render without crash |
| M6 | M6-041 | Insert synthetic OLTP data→run ETL→dashboard | Reconciled warehouse aggregate matches UI and source |

## Demonstration sequence (minimum)
1. Fresh DB initialization + v2 migrations, schema objects validated.
2. Donor registration, role assignment, strict geography.
3. Approved upcoming camp appears publicly, donor registration and capacity checked.
4. Hospital multi-item request, DB transaction and rollback.
5. Synthetic donation, staff screening, release, stock availability and unit reservation.
6. Two clients compete for same unit; only one reservation.
7. Bank dispatch and hospital receipt tracked separately.
8. Privacy-safe warehouse ETL rerun, materialized view refresh and measured EXPLAIN.
9. Show responsive pages at 390/768/1440px with network error and empty states.
10. All six members describe a view, function, procedure, trigger, index, transaction, concurrency and warehouse.

## Test status ledger
Before Friday demo record: ID, owner, RED proof, GREEN proof, latest CI URL, manual evidence where needed, blocker and reviewer.

---
name: bloodbridge-inventory-transactions
description: Use for BloodBridge blood-unit inventory, simulated release status, atomic reservations, request fulfillment, concurrent transactions and stock audit trails.
---

# Safe blood inventory transactions

## First read
`database/migrations/001_schema.sql` (`blood_units`, `request_items`, `inventory_reservations`, `fulfillments`, `fulfillment_units`, `inventory_movements`); `007_advanced_objects.sql` (`fn_reserve_blood_unit`, audit trigger); `backend/src/routes/inventory.js`; `backend/src/db.js`.

## Domain truth
- Individual `blood_units`: `blood_type_code`, `component_code`, `release_status`, `inventory_status`, `expires_at`, `blood_bank_id`.
- For this educational prototype, `release_status` is a **simulated verified staff action**; never claim real screening or release. Only released + in-stock + unexpired units may be reserved.
- Donor matching finds **potential recruitment**, not units ready for hospital fulfillment and not patient compatibility determination.
- Existing `fn_reserve_blood_unit(request_item_id, blood_unit_id, staff_user_id)` locks rows, verifies same exact type/component, authorized bank, expiry and request quantity, updates status and inserts reservation. A trigger writes inventory status movement history.

## Implementation workflow
1. Identify requested operation: stock summary, register donation, simulated unit release, reserve, cancel, dispatch, receive, discard.
2. For reservation, **call existing DB function** inside `inTransaction(async client => {...})`; do not duplicate checks in JS or make a separate direct `UPDATE blood_units` path.
3. For new state transitions, propose an explicit state diagram, transaction, authorization, idempotency behavior, immutable audit entry and cross-table assertions.
4. Prevent over-allocation across two simultaneous requests (use row locks + unique index `uq_blood_unit_active_reservation`); failures must roll back status and audit writes.
5. Test wrong blood type, different component, unreleased, expired, already reserved, foreign bank staff, canceled request, concurrency, and correct completion status. Use synthetic units only.
6. Return HTTP 409 for conflict and 403 for unauthorized; ensure backend error translation never exposes donor information.

## Acceptance
Concurrent double-reservation test shows exactly one success, no duplicate active reservation, consistent inventory status and exactly corresponding movement logs. Documentation explicitly says no patient/transfusion decision is made.

---
name: bloodbridge-database-design
description: Use for PostgreSQL ER diagrams, table/relationship design, normalization, migrations, constraints, geographical reference data, and schema documentation.
---

# BloodBridge relational modeling and migrations

## First read
`database/migrations/001_schema.sql`, `007_advanced_objects.sql`, `docs/ERD_REVISED.mmd`, `docs/DATABASE_WORKFLOW.md`, `docs/ADDITIONS_ONLY.md`.

## Existing database conventions
- PostgreSQL 16, OLTP database `bloodbridge`; UUIDs for user/donor/request/camp/unit transactions, identity BIGINT for various lookup/organization tables.
- Existing tables include `users`, `staff_memberships`, `donors`, `hospitals`, `blood_banks`, `blood_types`, `component_types`, `donations`, `blood_units`, `blood_requests`, `request_items`, `inventory_reservations`, `fulfillments`, `fulfillment_units`, `donation_camps`, `camp_registrations`, `locations`, province/district/DS lookup, plus audit/notifications.
- `blood_units` are individual component units; **do not reintroduce an editable aggregate quantity inventory**.

## Procedure
1. Map each requirement to its existing table and keys. Identify truly missing fields or relations before adding tables.
2. Document 1NF/2NF/3NF reasoning, entity relationships and cardinalities, unique constraints, FK/restrict-delete behavior, check constraints and required lookup values.
3. Write a forward-only migration `database/migrations/010_<feature>.sql` (or next unused number); use a transaction for compatible DDL, avoid destructive data resets.
4. For geography, validate `ds_divisions(district_code)` and paired `locations(ds_code,district_code)`; if GN is needed, extend as optional, verified code reference. Do not put Urban Council between district and DS.
5. Update `docs/ERD_REVISED.mmd`, relevant API payloads and seed/test data. Keep existing data and known demo codes working.
6. Prepare positive/negative SQL assertions for duplicate identity, invalid location parent, wrong component, expiry, missing authorization.
7. Test the migration on a disposable database containing fixtures and show verification output. A SQL file existing is not proof it executed.

## Acceptance
Schema diff and rollback/recovery instructions; ERD matches migration; integrity tests pass; database lead has reviewed changes; no user-facing API created without contract updates.

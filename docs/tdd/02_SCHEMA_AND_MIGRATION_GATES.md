# Database integration gates — read BEFORE copying v2 SQL

## Live repository fact
The `dev` branch already has `database/migrations/010_runtime_privileges.sql`, `scripts/migrate.js`, `backend/test/database-integration.test.js` and GitHub Actions. The previous v2 design pack is **not merged** into that branch.

## Mandatory migration reconciliation
The v2 package proposes `010_domain_extensions.sql`, `011_advanced_workflows.sql` and `012_reporting_objects.sql`. This CONFLICTS with the current 010 migration name and uses a different migration ledger schema.

**Recommended reviewed naming for new files:**
- `011_domain_extensions.sql` — adapt v2 domain extension.
- `012_advanced_workflows.sql` — adapt v2 triggers/functions/procedures.
- `013_reporting_objects.sql` — adapt v2 views/MVs.
- `database/warehouse/005_warehouse_extension.sql` — separate warehouse DB (NOT run by OLTP runner).

**Crucial:** `scripts/migrate.js` tracks `schema_migrations(version)`, while v2 SQL creates/inserts `schema_migrations(migration_id)`. Do **not** copy these exact v2 SQL files as-is. Remove embedded `schema_migrations` DDL/INSERT from the adapted migration files and let the runner record the filename in `version`. Review how the runner handles SQL containing explicit top-level `BEGIN`/`COMMIT` before deployment: prefer one transaction owner (runner), with adapted migration bodies free of their own transaction boundaries. Add checksums/advisory locking if reliable concurrent schema upgrades are needed.

The baseline `010_runtime_privileges.sql` grants privileges to `CURRENT_USER` (owner) and **does not create an independent least-privilege runtime role**. Treat this as incomplete security; review before claiming DB least privilege.

## Migration ownership matrix
| Change | First PR owner | Reviewers | Merge gate |
|---|---|---|---|
| Reconcile 011 domain extensions | Member 1 | Members 2, 4, 5 | Schema + FK P0 cases green |
| Adapt 012 advanced workflows | Member 1 integrates; M2/M3/M4/M5 each review their object signatures | Members 3,4,5 | SQL behavior and race tests green |
| Adapt 013 reporting views | Member 6 with Member 1 sign-off | Members 3,4 | Aggregates reconcile with source |
| Warehouse 005 | Member 6 | Member 1 | Separate DB verified; ETL runs twice without duplicates |
| 014+ further module migrations | Feature owner + DB lead allocates next free number | Member 1 + dependent owner | Added only after agreed API/schema contract |

## Avoid six people modifying same SQL file concurrently
1. Member 1 prepares reviewed baseline/migrations.
2. Each feature owner proposes SQL object signature in their test-first PR.
3. DB lead approves next migration number. Each person modifies only their allocated file.
4. Do not create a duplicate `fn_reserve_blood_unit` or a second incompatible donor table.
5. Never silently reset the Docker volume to fix a migration failure.

## Workflow decisions to freeze explicitly
- Is a canceled camp registration allowed to be reactivated? Required because `(camp_id, donor_id)` is unique.
- How does the system cancel a request after active reservation or dispatch? Specify lock and release rules before enabling cancellation.
- Distinguish `ACTIVE reservation`, `FULFILLED reservation`, `DISPATCHED fulfillment`, `RECEIVED fulfillment`.
- Blood compatibility beyond exact type matching is out of scope. Real clinical release needs qualified personnel.
- Decide API statuses for state conflicts (prefer 409) versus validation (400) and privileges (403); maintain one error shape.
- Scheduled reminders/outbox design is NEW and P1. Do not claim it exists in v2 or prioritize it above receipt correctness.

## Required pre-merge verification
- Fresh PostgreSQL 16 database: apply migrations in order, inspect tables/views/procedures/functions/triggers.
- Populated baseline upgrade: backup, migrate, validate old donor/request/camp records retained.
- Second migration run is safe and changes nothing.
- Negative FK/CHECK/unique tests and race tests pass.
- CI PostgreSQL integration job green.

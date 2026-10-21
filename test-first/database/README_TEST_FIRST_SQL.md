# SQL tests-first guide

The v2 package includes `tests/020_catalog_assertions.sql` and `tests/021_transactional_smoke.sql`; the current dev repo has behavioral integration tests in `backend/test/database-integration.test.js`. DO NOT copy SQL tests into production migration folder.

**First write failing SQL assertions** that verify the newly proposed objects. After the reviewed migration, rerun these assertions and confirm green. Example on PostgreSQL:

```sql
DO $$ BEGIN
  IF to_regclass('public.gn_divisions') IS NULL THEN
    RAISE EXCEPTION 'M1-DB schema contract RED: gn_divisions missing';
  END IF;
END $$;

DO $$ BEGIN
  IF to_regprocedure('public.sp_release_blood_unit(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'M4-DB stored procedure contract RED';
  END IF;
END $$;
```

This only verifies presence, not business behavior. Every owner MUST additionally write fixture-based tests calling the object and asserting state/rollback and SQLSTATE. Use separate `pg` sessions for race cases.

**Warning:** The proposed v2 SQL files currently have a migration-ledger mismatch with the actual repo; follow `docs/02_SCHEMA_AND_MIGRATION_GATES.md` before execution.

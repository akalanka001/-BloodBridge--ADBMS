---
name: bloodbridge-advanced-postgres
description: Use for demonstrating ADBMS requirements: PostgreSQL views, PL/pgSQL functions, procedures, triggers, transactions, query optimization, storage, indexes, and materialized views.
---

# Advanced PostgreSQL concepts as working application features

## Baseline / files
Inspect `database/migrations/007_advanced_objects.sql`, `009_verify_advanced_objects.sql`, `database/experiments/003_benchmarks.sql`, `008_advanced_experiments.sql`, `docs/DATABASE_WORKFLOW.md`. **007 already defines advanced objects; audit before adding others.**

## Demonstrations (implement and verify, not merely mention)
| Concept | Existing example or extension | Proof to capture |
|---|---|---|
| Regular views | `v_available_blood_stock`, `v_public_donation_camps`, `v_request_fulfillment_progress`, `v_camp_registration_summary` | `SELECT` output + endpoint using view |
| Scalar/table functions | `fn_available_unit_count`, `fn_camps_in_district` | Actual call + input/output |
| Transaction function | `fn_reserve_blood_unit` | One success + competing reservation fails |
| Stored procedure | `sp_approve_donation_camp` | Authorized approval + unauthorized denial |
| Triggers | `trg_check_camp_registration`, `trg_log_blood_unit_status` | Reject over capacity + audited stock change |
| ACID / locks | `BEGIN/COMMIT/ROLLBACK`, `FOR UPDATE` in reservation | Two-session concurrency evidence |
| B-tree/composite/partial | existing stock/donor indexes | paired explain plan, buffer/time, row counts |
| Hash | compare exact equality on a stable synthetic column | separate benchmark, not blindly add to production |
| Materialized view | `mv_monthly_donation_counts` | before/after `REFRESH MATERIALIZED VIEW` |
| CTE/window/joins | demand/ranking queries | actual result and SQL commentary |
| Partition/file organization | optional isolated synthetic lab | `EXPLAIN`, `pg_relation_size`, CLUSTER comparison, no destructive prod demo |

## Working rules
- Run experimental DDL **only in disposable benchmark database**, never automatically in app initialization. Hash/CLUSTER/partition comparisons must have a controlled dataset and record query planner decisions.
- Query optimization must measure real `EXPLAIN (ANALYZE, BUFFERS)` timings; do not hardcode fabricated 45ms→3ms figures into the admin UI.
- For `SELECT` queries, explain effects of distribution and table size; a sequential scan can be the correct plan.
- Every SQL object must have a real use case, exact invocation, tests, and report screenshot/output. Use `npm run db:check` only if PostgreSQL is up and current verification file matches installed objects.
- Never expose arbitrary SQL execution through public/admin API. Admin benchmark endpoint can use only predefined read-only query IDs.

## Acceptance
ADBMS evidence table with SQL object name, goal, call, tested output, authorization considerations, and report artifact; verification and real performance data attached.

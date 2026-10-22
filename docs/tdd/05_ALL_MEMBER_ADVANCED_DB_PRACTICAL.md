# Six-member shared advanced-PostgreSQL lab / viva requirements

Every member completes each station (execute, describe result and why used) IN ADDITION TO owning a module. Save actual output; no fabricated timings.

| Lab | Database concept | BloodBridge object or query | Mandatory explanation |
|---|---|---|---|
| A | ERD and 1NF/2NF/3NF | request header/lines; donor/user separation | Functional dependencies and cardinality |
| B | Constraints | `locations` composite FK, `camp_registrations` UNIQUE | Why SQL enforces integrity even if API misbehaves |
| C | View | `v_available_blood_stock` | Current snapshot query versus table storage |
| D | User-defined function | `fn_available_unit_count` / `fn_potential_donors` | `SELECT`/return type/stability and when UDF is useful |
| E | Procedure | `sp_approve_donation_camp` | `CALL`, staff verification, transaction caller controls commit |
| F | Trigger | `trg_log_blood_unit_status` | BEFORE/AFTER timing and audit same transaction |
| G | ACID, rollback and savepoints | `fn_reserve_blood_unit` + synthetic rejected update | Atomicity/Consistency/Isolation/Durability |
| H | Locks/isolation | Two connections reserve same unit | `FOR UPDATE`, partial unique, deadlock scenarios |
| I | B-tree / composite / partial index | `idx_donors_available_geo`, `idx_units_available` | Composite column order and predicate |
| J | Hash index lab | `database/experiments/008_advanced_experiments.sql` | Equality vs range, planner may choose seq scan |
| K | File organization / CLUSTER | Scratch heap demo | One-time physical reorganization and buffers |
| L | Partitioning | Scratch date-range request events | Partition pruning in EXPLAIN |
| M | Query optimization | `EXPLAIN (ANALYZE, BUFFERS)` | Estimated/actual rows, time, buffers; no fake benchmarks |
| N | CTE, join, window, ROLLUP | Monthly district donations/requests | Running total, ranking and subtotals |
| O | Materialized views | `mv_monthly_donation_counts` | Refresh requirement and stale results |
| P | Star schema and ETL | Warehouse `dim_*`, `fact_*` | Grain, surrogate keys, privacy, idempotency |
| Q | DB roles/audit | runtime owner vs restricted role | GRANT and protection against role bypass |
| R | Events vs jobs | donor_status_events; optional `event_outbox` | Business event vs PostgreSQL trigger vs scheduler |

**Each person supplies 18 short SQL examples + answers to a 20-question viva sheet.** DB lead assigns two labs per day for peer teaching. No one claims automated clinical compatibility.

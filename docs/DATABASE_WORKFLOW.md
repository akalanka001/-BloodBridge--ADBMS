# Database-first learning, testing and demo checklist

## SQL installation order

1. `001_schema.sql`: relational tables, PK/FK, CHECK, composite and partial indexes.
2. `002_seed_reference.sql`: local development geography + blood types; codes are **not official identifiers**.
3. `007_advanced_objects.sql`: 4 regular views, 5 functions (including 2 trigger functions), 1 stored procedure, 2 triggers, 1 materialized view.
4. Separate warehouse: `004_warehouse.sql` in database `bloodbridge_warehouse`.
5. `009_verify_advanced_objects.sql`: PostgreSQL catalog inspection on demand, **not** an automatic migration.
6. `experiments/003_benchmarks.sql`, `experiments/008_advanced_experiments.sql`: run in test/scratch environments and capture measured results; these are **not** application startup scripts.

## Concepts that must appear in your final demonstration

| Concept | Concrete implementation/evidence |
|---|---|
| View | `SELECT * FROM v_public_donation_camps;` and `v_available_blood_stock` |
| User-defined function | `SELECT fn_available_unit_count(<bankId>,'O-','RBC');` |
| Stored procedure | `CALL sp_approve_donation_camp(<campUuid>,<staffUuid>);` |
| Trigger | Register for a full camp (expected rejection) and update a blood-unit status (audit row) |
| ACID transaction | Create a request and its items atomically; trigger rollback on an injected invalid line |
| Concurrency | Try to reserve one unit simultaneously in two sessions: at most one succeeds |
| Composite/partial index | Explain an in-stock blood-unit search and donor-by-district filter |
| Hash index experiment | Exact-match equality query vs B-Tree / seq scan on synthetic data |
| CTE / window functions | Monthly ranking of participating districts in `008` |
| Physical organization | Heap size vs clustered ordering experiment on disposable test table |
| Normalization | ERD, 1NF/2NF/3NF explanation and relational mapping |
| Materialized view | `mv_monthly_donation_counts` and explicit refresh semantics |
| Warehouse | `dim_*`, `fact_*` star-schema tables and a tested ETL load |
| Security | JWT/role check + institution membership + DB privilege design |

## Transaction example

```sql
BEGIN;
SELECT fn_reserve_blood_unit(
  'REAL_REQUEST_ITEM_UUID'::uuid,
  'REAL_BLOOD_UNIT_UUID'::uuid,
  'REAL_BANK_STAFF_UUID'::uuid
);
COMMIT;
```

Reservations are exact component/type matches for **inventory management demonstration only**, not transfusion compatibility. The function uses row locks and returns an allocation UUID. Audit movement is written by the inventory status trigger inside the transaction. If the function throws, neither status nor reservation should persist.

## Important integration caveats

- **Only two triggers** defined in the starter; do not claim every table has audit triggers.
- The runtime starts an empty inventory and no donor/hospital data except optionally seeded *fictional* accounts/camp. Populate synthetic blood-unit fixtures before expecting stock views to return rows.
- The warehouse's schema exists, but ETL **is not yet built**. The fact tables will remain empty until a team member implements a privacy-preserving load.
- The advanced SQL is included but cannot be assumed functionally correct until tests run in the team's PostgreSQL environment.
- For materialized view refresh `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_donation_counts;` requires the existing unique index (present) and may return no data without donations.
- SQL clustering and hash-index experiments should never block day-to-day transactions. Run on disposable large synthetic datasets and record actual timings.

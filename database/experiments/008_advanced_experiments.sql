-- Advanced database laboratory: run ONLY on a development/benchmark database.
-- These demonstrations use temp/synthetic tables rather than changing production data.
-- Benchmark plans differ by dataset size, system statistics, and hardware.

-- A. Compare hash and B-tree indexes for an equality lookup.
-- Both tables contain the same 50,000 fictional email addresses.
CREATE TEMP TABLE bb_btree_demo AS
SELECT g AS demo_id, 'synthetic.'||g||'@example.test' AS email
FROM generate_series(1,50000) AS g;
CREATE TEMP TABLE bb_hash_demo AS SELECT * FROM bb_btree_demo;
CREATE INDEX bb_btree_email_idx ON bb_btree_demo USING btree(email);
CREATE INDEX bb_hash_email_idx ON bb_hash_demo USING hash(email);
ANALYZE bb_btree_demo;
ANALYZE bb_hash_demo;
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bb_btree_demo WHERE email = 'synthetic.49000@example.test';
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bb_hash_demo WHERE email = 'synthetic.49000@example.test';
-- Do not claim hash is always faster; record actual plan and buffer statistics.

-- B. File organization / physical size / clustering (scratch table only).
CREATE TEMP TABLE bb_heap_demo AS SELECT * FROM bb_btree_demo;
CREATE INDEX bb_heap_demo_email_idx ON bb_heap_demo(email);
ANALYZE bb_heap_demo;
SELECT pg_size_pretty(pg_relation_size('bb_heap_demo')) AS heap_size,
       pg_size_pretty(pg_total_relation_size('bb_heap_demo')) AS table_plus_indexes;
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bb_heap_demo WHERE email BETWEEN 'synthetic.8000@example.test'
                                     AND 'synthetic.8010@example.test';
CLUSTER bb_heap_demo USING bb_heap_demo_email_idx;
ANALYZE bb_heap_demo;
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bb_heap_demo WHERE email BETWEEN 'synthetic.8000@example.test'
                                     AND 'synthetic.8010@example.test';
-- CLUSTER is a one-time physical reorganization; not automatic ongoing clustering.

-- C. Advanced SQL: CTE + window function for geographic monthly camp activity.
WITH monthly_camps AS (
 SELECT l.district_code,
        date_trunc('month',c.starts_at AT TIME ZONE 'Asia/Colombo')::date AS month_start,
        count(*)::bigint AS camp_count
 FROM donation_camps c JOIN locations l ON l.id = c.location_id
 WHERE c.status IN ('APPROVED','COMPLETED')
 GROUP BY l.district_code, 2
)
SELECT district_code, month_start, camp_count,
       sum(camp_count) OVER (
         PARTITION BY district_code ORDER BY month_start
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS district_running_total
FROM monthly_camps ORDER BY district_code, month_start;

-- D. EXPLAIN analyze critical operational search; collect actual timing.
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM donors
WHERE blood_type_code='O-' AND district_code='CO' AND available_for_contact;
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM blood_units
WHERE blood_bank_id=1 AND blood_type_code='O-'
 AND component_code='RBC' AND release_status='RELEASED'
 AND inventory_status='IN_STOCK' AND expires_at > now();

-- E. OPTIONAL partitioning demo (not required for Friday if time is short).
CREATE TEMP TABLE bb_request_events_demo (
 event_id bigint, event_date date NOT NULL, event_kind text
) PARTITION BY RANGE (event_date);
CREATE TEMP TABLE bb_req_oct2026 PARTITION OF bb_request_events_demo
 FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TEMP TABLE bb_req_other PARTITION OF bb_request_events_demo DEFAULT;
INSERT INTO bb_request_events_demo VALUES
(1,'2026-10-05','OPEN'),(2,'2026-10-21','FULFILLED'),(3,'2026-11-01','OPEN');
EXPLAIN SELECT * FROM bb_request_events_demo
WHERE event_date >= '2026-10-01' AND event_date < '2026-11-01';
-- Expected concept: partition pruning; plan shape may vary for tiny datasets.

-- F. Transaction / SAVEPOINT demonstration on a synthetic temporary table.
CREATE TEMP TABLE bb_tx_savepoint_demo (id INTEGER PRIMARY KEY, label TEXT);
BEGIN;
INSERT INTO bb_tx_savepoint_demo VALUES (1, 'kept');
SAVEPOINT before_optional_insert;
INSERT INTO bb_tx_savepoint_demo VALUES (2, 'rolled-back');
ROLLBACK TO SAVEPOINT before_optional_insert;
COMMIT;
SELECT * FROM bb_tx_savepoint_demo ORDER BY id; -- Only (1, 'kept') remains.

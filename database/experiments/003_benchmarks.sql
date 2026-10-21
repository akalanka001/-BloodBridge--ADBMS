-- Benchmark after seeding large synthetic data (at least 10k / 100k records).
-- Record timings and plans, avoid fabricating improvement percentages.
-- 1: Index-friendly donor search
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM donors WHERE blood_type_code = 'O-' AND district_code = 'CO' AND available_for_contact = TRUE;
-- 2: Available released, unexpired inventory
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM blood_units WHERE blood_bank_id = 1 AND blood_type_code = 'O-'
 AND component_code = 'RBC' AND release_status = 'RELEASED'
 AND inventory_status = 'IN_STOCK' AND expires_at > now()
 ORDER BY expires_at LIMIT 10;
-- 3: Published camps in the district
EXPLAIN (ANALYZE, BUFFERS)
SELECT DISTINCT c.id,c.title,c.starts_at
 FROM donation_camps c JOIN locations l ON l.id=c.location_id
 WHERE c.status='APPROVED' AND l.district_code='CO' AND c.starts_at>=now()
 ORDER BY c.starts_at LIMIT 20;
-- To compare, do NOT drop production indexes. Benchmark on a disposable clone and keep plans.
-- Optional index experiments: separate B-tree vs hash email equality on a synthetic scratch table.

-- Read-only object inventory after running migration 007.
-- These queries verify OBJECT EXISTENCE, not successful business behavior.
SELECT 'views' AS concept, count(*) AS installed
FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'v_%'
UNION ALL
SELECT 'materialized_views', count(*) FROM pg_matviews
 WHERE schemaname = 'public' AND matviewname LIKE 'mv_%'
UNION ALL
SELECT 'functions', count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f'
 AND p.proname LIKE 'fn_%'
UNION ALL
SELECT 'procedures', count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='p'
 AND p.proname LIKE 'sp_%'
UNION ALL
SELECT 'triggers', count(*) FROM pg_trigger t
 JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgname LIKE 'trg_%';

SELECT tablename, indexname, indexdef FROM pg_indexes
 WHERE schemaname='public'
 AND tablename IN ('donors','blood_units','donation_camps','inventory_reservations')
 ORDER BY tablename,indexname;

-- Refresh warehouse-style reporting snapshot after new donations.
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_donation_counts;

-- Recommended integration assertions to implement in Jest/Supertest + Postgres:
-- 1) camp draft/pending registration rejected by trigger
-- 2) approved upcoming camp accepts one registration
-- 3) two concurrent registrations cannot exceed camp capacity
-- 4) user from another bank cannot approve camp
-- 5) approved camp appears in public view; pending camp does not
-- 6) quarantined, expired, already-reserved units cannot be reserved
-- 7) concurrent requests for the same unit yield exactly one reservation
-- 8) reservation inserts inventory_movement audit row automatically
-- 9) rolled-back reservation leaves no reservation or movement
-- 10) aggregated view stock totals equal direct filtered count

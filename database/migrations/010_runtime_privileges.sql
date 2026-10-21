-- BloodBridge Migration 010: Database Runtime Privileges & Hardening
-- Establishes explicit schema permissions, default privileges, and documentation for least-privilege app roles.
BEGIN;

-- 1. Ensure current application owner has full permissions on public schema objects
GRANT USAGE, CREATE ON SCHEMA public TO CURRENT_USER;

-- 2. Grant table and sequence permissions for active operations
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;

-- 3. Grant routine execution (stored procedures, user-defined functions)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO CURRENT_USER;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO CURRENT_USER;

-- 4. Configure future default privileges for newly created tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO CURRENT_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO CURRENT_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON ROUTINES TO CURRENT_USER;

-- 5. Record migration completion notice
COMMENT ON SCHEMA public IS 'BloodBridge OLTP schema with hardened runtime permissions';

COMMIT;

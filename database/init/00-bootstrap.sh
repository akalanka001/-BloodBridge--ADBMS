#!/bin/sh
# Runs once on first initialization of an empty postgres data volume,
# or when explicitly executed to ensure all migrations are applied.
set -eu
export PGUSER="$POSTGRES_USER"
export PGDATABASE="$POSTGRES_DB"
export PGPASSWORD="$POSTGRES_PASSWORD"

echo '=== BloodBridge: creating schema_migrations tracking table ==='
psql -v ON_ERROR_STOP=1 -c '
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);'

echo '=== BloodBridge: applying database migrations in order ==='
for file in $(ls -1 /workspace/database/migrations/*.sql 2>/dev/null | sort); do
  fname=$(basename "$file")
  # Skip non-migration verification scripts (e.g. 009_verify_advanced_objects.sql)
  case "$fname" in
    009_*)
      echo "Skipping verification script: $fname"
      continue
      ;;
  esac

  # Check if migration has already been recorded
  already_applied=$(psql -t -A -c "SELECT 1 FROM schema_migrations WHERE version = '$fname';")
  if [ "$already_applied" = "1" ]; then
    echo "Migration already applied: $fname"
    continue
  fi

  echo "Applying migration: $fname"
  psql -v ON_ERROR_STOP=1 -f "$file"
  psql -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations(version) VALUES ('$fname') ON CONFLICT (version) DO NOTHING;"
done

echo '=== BloodBridge: creating analytical warehouse ==='
warehouse_exists=$(psql -t -A -d postgres -c "SELECT 1 FROM pg_database WHERE datname = 'bloodbridge_warehouse';")
if [ "$warehouse_exists" != "1" ]; then
  psql -v ON_ERROR_STOP=1 -d postgres -c 'CREATE DATABASE bloodbridge_warehouse;'
fi

if [ -f /workspace/database/warehouse/004_warehouse.sql ]; then
  psql -v ON_ERROR_STOP=1 -d bloodbridge_warehouse -f /workspace/database/warehouse/004_warehouse.sql
fi

echo '=== BloodBridge: database initialization completed ==='


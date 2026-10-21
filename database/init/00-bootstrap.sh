#!/bin/sh
# Runs once on first initialization of an empty postgres data volume.
set -eu
export PGUSER="$POSTGRES_USER"
export PGDATABASE="$POSTGRES_DB"
export PGPASSWORD="$POSTGRES_PASSWORD"
echo '=== BloodBridge: installing OLTP schema and master data ==='
psql -v ON_ERROR_STOP=1 -f /workspace/database/migrations/001_schema.sql
psql -v ON_ERROR_STOP=1 -f /workspace/database/migrations/002_seed_reference.sql
echo '=== BloodBridge: installing advanced SQL (views, functions, procedures, triggers) ==='
psql -v ON_ERROR_STOP=1 -f /workspace/database/migrations/007_advanced_objects.sql
echo '=== BloodBridge: creating analytical warehouse ==='
psql -v ON_ERROR_STOP=1 -d postgres -c 'CREATE DATABASE bloodbridge_warehouse;'
psql -v ON_ERROR_STOP=1 -d bloodbridge_warehouse -f /workspace/database/warehouse/004_warehouse.sql
echo '=== BloodBridge: database initialization completed ==='

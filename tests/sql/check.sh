#!/usr/bin/env bash
# A disposable EMPTY PostgreSQL database only. Never point this at Supabase.
set -euo pipefail
cd "$(dirname "$0")/../.."
psql -v ON_ERROR_STOP=1 -f tests/sql/auth-bootstrap.sql
for migration in supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -f "$migration"
done
psql -v ON_ERROR_STOP=1 -f tests/sql/auth-fixtures.sql
psql -v ON_ERROR_STOP=1 -f tests/sql/save_island.sql
psql -v ON_ERROR_STOP=1 -f tests/sql/authorization.sql

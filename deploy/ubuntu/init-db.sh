#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v app_password="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE mosquito_api LOGIN PASSWORD :'app_password';
SQL
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /bootstrap/schema.sql
for migration in /bootstrap/migrations/*.sql; do
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
done
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
GRANT CONNECT ON DATABASE mosquito TO mosquito_api;
GRANT USAGE ON SCHEMA public TO mosquito_api;
GRANT SELECT, INSERT ON surveys, sites, evidence, audit_events TO mosquito_api;
SQL

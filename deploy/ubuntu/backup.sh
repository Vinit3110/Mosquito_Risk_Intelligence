#!/bin/sh
# Run from this directory. API downtime provides a consistent DB + file snapshot.
set -eu
umask 077
cd "$(dirname "$0")"
set -a
. ./.env
set +a
stamp=$(date -u +%Y%m%dT%H%M%SZ)
destination="$BACKUP_DIR/$stamp"
mkdir "$destination"
docker compose stop api
trap 'docker compose start api >/dev/null' EXIT
docker compose exec -T database pg_dump -U mosquito_admin -d mosquito -Fc > "$destination/database.dump"
tar -C "$EVIDENCE_DIR" -czf "$destination/evidence.tar.gz" .
(cd "$destination" && sha256sum database.dump evidence.tar.gz > SHA256SUMS)
printf '%s\n' "$destination"

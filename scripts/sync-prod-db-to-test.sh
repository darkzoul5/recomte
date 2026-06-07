#!/usr/bin/env bash
set -Eeuo pipefail

# Sync production SQLite DB into the test environment.
# Run this on the server in the same directory as docker-compose.yml.

PROD_CONTAINER="${PROD_CONTAINER:-recomte_app}"
TEST_SERVICE="${TEST_SERVICE:-app_test}"

PROD_DB_IN_CONTAINER="${PROD_DB_IN_CONTAINER:-/app/data/app.db}"
BACKUPS_DIR_IN_CONTAINER="${BACKUPS_DIR_IN_CONTAINER:-/app/data/backups}"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_filename="prod-${timestamp}.db"
backup_in_container="${BACKUPS_DIR_IN_CONTAINER}/${backup_filename}"

echo "[sync] Stopping test service (${TEST_SERVICE})..."
docker compose -f "${COMPOSE_FILE}" stop "${TEST_SERVICE}"

echo "[sync] Creating prod backup inside ${PROD_CONTAINER}..."
docker exec "${PROD_CONTAINER}" node ./scripts/backup-db.js --db "${PROD_DB_IN_CONTAINER}" --out "${backup_in_container}"

echo "[sync] Copying backup into test DB bind mount..."
mkdir -p ./test-data ./test-data/backups

if [ -f ./test-data/app.db-wal ]; then
  rm -f ./test-data/app.db-wal
fi

if [ -f ./test-data/app.db-shm ]; then
  rm -f ./test-data/app.db-shm
fi

cp -f "./data/backups/${backup_filename}" "./test-data/backups/${backup_filename}"
cp -f "./data/backups/${backup_filename}" "./test-data/app.db"

echo "[sync] Starting test service (${TEST_SERVICE})..."
docker compose -f "${COMPOSE_FILE}" up -d "${TEST_SERVICE}"

echo "[sync] Done. Test DB replaced at ./test-data/app.db"
echo "[sync] Snapshot saved at ./test-data/backups/${backup_filename}"

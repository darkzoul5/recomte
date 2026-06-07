#!/usr/bin/env bash
set -Eeuo pipefail

# Sync production SQLite DB into the test environment.
# Run this on the server in the same directory as docker-compose.yml.

PROD_CONTAINER="${PROD_CONTAINER:-recomte_app}"
TEST_SERVICE="${TEST_SERVICE:-app_test}"

PROD_DB_IN_CONTAINER="${PROD_DB_IN_CONTAINER:-/app/data/app.db}"
BACKUPS_DIR_IN_CONTAINER="${BACKUPS_DIR_IN_CONTAINER:-/app/data/backups}"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

PROD_BACKUPS_DIR_LOCAL="${PROD_BACKUPS_DIR_LOCAL:-./data/backups}"
TEST_BACKUPS_DIR_LOCAL="${TEST_BACKUPS_DIR_LOCAL:-./storage/test/backups}"

PROD_RETENTION_DAYS="${PROD_RETENTION_DAYS:-30}"
PROD_KEEP_COUNT="${PROD_KEEP_COUNT:-14}"
TEST_PROD_RETENTION_DAYS="${TEST_PROD_RETENTION_DAYS:-7}"
TEST_PROD_KEEP_COUNT="${TEST_PROD_KEEP_COUNT:-5}"
TEST_BEFORE_SYNC_RETENTION_DAYS="${TEST_BEFORE_SYNC_RETENTION_DAYS:-7}"
TEST_BEFORE_SYNC_KEEP_COUNT="${TEST_BEFORE_SYNC_KEEP_COUNT:-3}"

prune_backups() {
  local dir="$1"
  local pattern="$2"
  local retention_days="$3"
  local keep_count="$4"

  mkdir -p "$dir"

  find "$dir" -maxdepth 1 -type f -name "$pattern" -mtime +"$retention_days" -delete

  mapfile -t files < <(find "$dir" -maxdepth 1 -type f -name "$pattern" -printf '%T@ %p\n' | sort -nr | awk '{print $2}')

  if [ "${#files[@]}" -le "$keep_count" ]; then
    return
  fi

  for file in "${files[@]:$keep_count}"; do
    rm -f "$file"
  done
}

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_filename="prod-${timestamp}.db"
backup_in_container="${BACKUPS_DIR_IN_CONTAINER}/${backup_filename}"
test_backup_filename="test-before-sync-${timestamp}.db"

echo "[sync] Stopping test service (${TEST_SERVICE})..."
docker compose -f "${COMPOSE_FILE}" stop "${TEST_SERVICE}"

echo "[sync] Creating prod backup inside ${PROD_CONTAINER}..."
docker exec "${PROD_CONTAINER}" node ./scripts/backup-db.js --db "${PROD_DB_IN_CONTAINER}" --out "${backup_in_container}"

echo "[sync] Copying backup into test DB bind mount..."
mkdir -p ./storage/test/db ./storage/test/images/caravans "${TEST_BACKUPS_DIR_LOCAL}" "${PROD_BACKUPS_DIR_LOCAL}"

if [ -f ./storage/test/db/app.db-wal ]; then
  rm -f ./storage/test/db/app.db-wal
fi

if [ -f ./storage/test/db/app.db-shm ]; then
  rm -f ./storage/test/db/app.db-shm
fi

if [ -f ./storage/test/db/app.db ]; then
  cp -f ./storage/test/db/app.db "${TEST_BACKUPS_DIR_LOCAL}/${test_backup_filename}"
fi

cp -f "${PROD_BACKUPS_DIR_LOCAL}/${backup_filename}" "${TEST_BACKUPS_DIR_LOCAL}/${backup_filename}"
cp -f "${PROD_BACKUPS_DIR_LOCAL}/${backup_filename}" "./storage/test/db/app.db"

echo "[sync] Syncing caravan images into test assets bind mount..."
mkdir -p ./storage/test/images/caravans
rm -rf ./storage/test/images/caravans/*

if [ -d ./public/images/caravans ]; then
  cp -a ./public/images/caravans/. ./storage/test/images/caravans/
fi

echo "[sync] Starting test service (${TEST_SERVICE})..."
docker compose -f "${COMPOSE_FILE}" up -d "${TEST_SERVICE}"

echo "[sync] Pruning old backup snapshots..."
prune_backups "${PROD_BACKUPS_DIR_LOCAL}" 'prod-*.db' "${PROD_RETENTION_DAYS}" "${PROD_KEEP_COUNT}"
prune_backups "${TEST_BACKUPS_DIR_LOCAL}" 'prod-*.db' "${TEST_PROD_RETENTION_DAYS}" "${TEST_PROD_KEEP_COUNT}"
prune_backups "${TEST_BACKUPS_DIR_LOCAL}" 'test-before-sync-*.db' "${TEST_BEFORE_SYNC_RETENTION_DAYS}" "${TEST_BEFORE_SYNC_KEEP_COUNT}"

echo "[sync] Done. Test DB replaced at ./storage/test/db/app.db"
echo "[sync] Snapshot saved at ${TEST_BACKUPS_DIR_LOCAL}/${backup_filename}"
if [ -f "${TEST_BACKUPS_DIR_LOCAL}/${test_backup_filename}" ]; then
  echo "[sync] Previous test DB saved at ${TEST_BACKUPS_DIR_LOCAL}/${test_backup_filename}"
fi
echo "[sync] Test caravan images refreshed at ./storage/test/images/caravans"

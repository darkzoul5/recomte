#!/usr/bin/env bash
set -Eeuo pipefail

# Sync production SQLite DB into the test environment.
# Run this on the server in the project repository.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

PROD_CONTAINER="${PROD_CONTAINER:-recomte_app}"
TEST_SERVICE="${TEST_SERVICE:-app_test}"

PROD_STORAGE_ROOT_IN_CONTAINER="${PROD_STORAGE_ROOT_IN_CONTAINER:-/app/storage}"
BACKUPS_DIR_IN_CONTAINER="${BACKUPS_DIR_IN_CONTAINER:-${PROD_STORAGE_ROOT_IN_CONTAINER}/backups}"

COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.yml}"

PROD_STORAGE_ROOT_LOCAL="${PROD_STORAGE_ROOT_LOCAL:-./storage/prod}"
TEST_STORAGE_ROOT_LOCAL="${TEST_STORAGE_ROOT_LOCAL:-./storage/test}"
PROD_DB_LOCAL="${PROD_DB_LOCAL:-${PROD_STORAGE_ROOT_LOCAL}/db/app.db}"
TEST_DB_LOCAL="${TEST_DB_LOCAL:-${TEST_STORAGE_ROOT_LOCAL}/db/app.db}"
PROD_IMAGES_DIR_LOCAL="${PROD_IMAGES_DIR_LOCAL:-${PROD_STORAGE_ROOT_LOCAL}/images/caravans}"
TEST_IMAGES_DIR_LOCAL="${TEST_IMAGES_DIR_LOCAL:-${TEST_STORAGE_ROOT_LOCAL}/images/caravans}"
PROD_BACKUPS_DIR_LOCAL="${PROD_BACKUPS_DIR_LOCAL:-${PROD_STORAGE_ROOT_LOCAL}/backups}"
TEST_BACKUPS_DIR_LOCAL="${TEST_BACKUPS_DIR_LOCAL:-${TEST_STORAGE_ROOT_LOCAL}/backups}"

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
docker exec "${PROD_CONTAINER}" node ./scripts/backup-db.js --out "${backup_in_container}"

echo "[sync] Copying backup into test DB bind mount..."
mkdir -p "$(dirname "${TEST_DB_LOCAL}")" "${TEST_IMAGES_DIR_LOCAL}" "${TEST_BACKUPS_DIR_LOCAL}" "${PROD_BACKUPS_DIR_LOCAL}"

if [ -f "${TEST_DB_LOCAL}-wal" ]; then
  rm -f "${TEST_DB_LOCAL}-wal"
fi

if [ -f "${TEST_DB_LOCAL}-shm" ]; then
  rm -f "${TEST_DB_LOCAL}-shm"
fi

if [ -f "${TEST_DB_LOCAL}" ]; then
  cp -f "${TEST_DB_LOCAL}" "${TEST_BACKUPS_DIR_LOCAL}/${test_backup_filename}"
fi

cp -f "${PROD_BACKUPS_DIR_LOCAL}/${backup_filename}" "${TEST_BACKUPS_DIR_LOCAL}/${backup_filename}"
cp -f "${PROD_BACKUPS_DIR_LOCAL}/${backup_filename}" "${TEST_DB_LOCAL}"

echo "[sync] Syncing caravan images into test assets bind mount..."
mkdir -p "${TEST_IMAGES_DIR_LOCAL}"
rm -rf "${TEST_IMAGES_DIR_LOCAL:?}"/*

if [ -d "${PROD_IMAGES_DIR_LOCAL}" ]; then
  cp -a "${PROD_IMAGES_DIR_LOCAL}/." "${TEST_IMAGES_DIR_LOCAL}/"
fi

echo "[sync] Starting test service (${TEST_SERVICE})..."
docker compose -f "${COMPOSE_FILE}" up -d "${TEST_SERVICE}"

echo "[sync] Pruning old backup snapshots..."
prune_backups "${PROD_BACKUPS_DIR_LOCAL}" 'prod-*.db' "${PROD_RETENTION_DAYS}" "${PROD_KEEP_COUNT}"
prune_backups "${TEST_BACKUPS_DIR_LOCAL}" 'prod-*.db' "${TEST_PROD_RETENTION_DAYS}" "${TEST_PROD_KEEP_COUNT}"
prune_backups "${TEST_BACKUPS_DIR_LOCAL}" 'test-before-sync-*.db' "${TEST_BEFORE_SYNC_RETENTION_DAYS}" "${TEST_BEFORE_SYNC_KEEP_COUNT}"

echo "[sync] Done. Test DB replaced at ${TEST_DB_LOCAL}"
echo "[sync] Snapshot saved at ${TEST_BACKUPS_DIR_LOCAL}/${backup_filename}"
if [ -f "${TEST_BACKUPS_DIR_LOCAL}/${test_backup_filename}" ]; then
  echo "[sync] Previous test DB saved at ${TEST_BACKUPS_DIR_LOCAL}/${test_backup_filename}"
fi
echo "[sync] Test caravan images refreshed at ${TEST_IMAGES_DIR_LOCAL}"

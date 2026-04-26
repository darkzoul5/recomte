#!/usr/bin/env bash
set -Eeuo pipefail

LOCK_FILE="/tmp/campersite-deploy.lock"
DEPLOY_DIR="/home/deploy/docker/campersite"
MAX_RETRIES=5

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
	echo "Another deploy is already running. Exiting."
	exit 0
fi

cd "${DEPLOY_DIR}"

echo "[deploy] Pulling repository updates..."
git pull --ff-only

echo "[deploy] Pulling latest images..."
docker compose pull

echo "[deploy] Starting services..."
attempt=1
while true; do
	if docker compose up -d --remove-orphans; then
		break
	fi

	if [ "${attempt}" -ge "${MAX_RETRIES}" ]; then
		echo "[deploy] Failed after ${MAX_RETRIES} attempts."
		exit 1
	fi

	echo "[deploy] docker compose up failed (attempt ${attempt}/${MAX_RETRIES}). Retrying..."
	attempt=$((attempt + 1))
	sleep 3
done

echo "[deploy] Completed successfully."
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
REPO="git.darkzoul.org/dark_zoul/campersite"

# Capture current image IDs for :latest and :dev before pulling new images
echo "[deploy] Recording current image IDs for ${REPO} (:latest and :dev)"
OLD_LATEST_ID="$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep "^${REPO}:latest" | awk '{print $2}' || true)"
OLD_DEV_ID="$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep "^${REPO}:dev" | awk '{print $2}' || true)"

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

# After successful deploy, check new image IDs for tags and remove old ones if they changed
echo "[deploy] Checking new image IDs for ${REPO} (:latest and :dev)"
NEW_LATEST_ID="$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep "^${REPO}:latest" | awk '{print $2}' || true)"
NEW_DEV_ID="$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep "^${REPO}:dev" | awk '{print $2}' || true)"

set +e
if [ -n "$OLD_LATEST_ID" ] && [ -n "$NEW_LATEST_ID" ] && [ "$OLD_LATEST_ID" != "$NEW_LATEST_ID" ]; then
	echo "[deploy] :latest changed (old=$OLD_LATEST_ID new=$NEW_LATEST_ID) -> removing old image"
	docker image rm -f "$OLD_LATEST_ID" || echo "[deploy] Warning: failed to remove old :latest image $OLD_LATEST_ID"
fi

if [ -n "$OLD_DEV_ID" ] && [ -n "$NEW_DEV_ID" ] && [ "$OLD_DEV_ID" != "$NEW_DEV_ID" ]; then
	echo "[deploy] :dev changed (old=$OLD_DEV_ID new=$NEW_DEV_ID) -> removing old image"
	docker image rm -f "$OLD_DEV_ID" || echo "[deploy] Warning: failed to remove old :dev image $OLD_DEV_ID"
fi
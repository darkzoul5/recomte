#!/usr/bin/env bash
set -Eeuo pipefail

LOCK_FILE="/tmp/recomte-deploy.lock"
DEPLOY_DIR="/home/deploy/docker/recomte"
COMPOSE_FILE="docker/compose.yml"
COMPOSE_WAIT_TIMEOUT=120

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
	echo "Another deploy is already running. Exiting."
	exit 0
fi

cd "${DEPLOY_DIR}"

declare -A OLD_APP_IMAGE_IDS

while read -r CONTAINER_ID; do
	if [ -n "${CONTAINER_ID}" ]; then
		IMAGE_ID="$(docker inspect --format '{{.Image}}' "${CONTAINER_ID}")"
		OLD_APP_IMAGE_IDS["${IMAGE_ID}"]=1
	fi
done < <(docker compose -f "${COMPOSE_FILE}" ps -q app)

echo "[deploy] Pulling repository updates..."
git fetch origin
git reset --hard origin/main
git clean -fd
EXPECTED_COMMIT="$(git rev-parse HEAD)"
echo "[deploy] Expected application commit: ${EXPECTED_COMMIT}"

echo "[deploy] Pulling latest images..."
docker compose -f "${COMPOSE_FILE}" pull

echo "[deploy] Starting services and waiting for health checks..."
if ! docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans --wait --wait-timeout "${COMPOSE_WAIT_TIMEOUT}"; then
	echo "[deploy] Services failed to become healthy within ${COMPOSE_WAIT_TIMEOUT}s." >&2
	exit 1
fi

echo "[deploy] Waiting for every production container to report ${EXPECTED_COMMIT}..."

mapfile -t APP_CONTAINER_IDS < <(docker compose -f "${COMPOSE_FILE}" ps -q app)
if [ "${#APP_CONTAINER_IDS[@]}" -eq 0 ]; then
	echo "[deploy] No production app containers are available after Compose reported success." >&2
	exit 1
fi

for CONTAINER_ID in "${APP_CONTAINER_IDS[@]}"; do
	docker exec \
		-e "EXPECTED_COMMIT=${EXPECTED_COMMIT}" \
		-e 'VERSION_URL=http://127.0.0.1:3000/api/version' \
		-e 'VERSION_VERIFY_TIMEOUT_MS=5000' \
		-e 'VERSION_VERIFY_INTERVAL_MS=0' \
		-e 'VERSION_VERIFY_REQUEST_TIMEOUT_MS=2000' \
		"${CONTAINER_ID}" node /app/scripts/verify-deployment-version.js
done

echo "[deploy] Every production container reports ${EXPECTED_COMMIT}."

declare -A CURRENT_APP_IMAGE_IDS

for CONTAINER_ID in "${APP_CONTAINER_IDS[@]}"; do
	IMAGE_ID="$(docker inspect --format '{{.Image}}' "${CONTAINER_ID}")"
	CURRENT_APP_IMAGE_IDS["${IMAGE_ID}"]=1
done

for OLD_IMAGE_ID in "${!OLD_APP_IMAGE_IDS[@]}"; do
	if [ -z "${CURRENT_APP_IMAGE_IDS[${OLD_IMAGE_ID}]:-}" ]; then
		echo "[deploy] Removing replaced project app image ${OLD_IMAGE_ID}..."
		if docker image rm "${OLD_IMAGE_ID}"; then
			echo "[deploy] Removed replaced project app image ${OLD_IMAGE_ID}."
		else
			echo "[deploy] Could not remove ${OLD_IMAGE_ID}; it may still be in use." >&2
		fi
	fi
done

cd "${DEPLOY_DIR}"
./scripts/sync-test-db.sh

echo "[deploy] Completed successfully."
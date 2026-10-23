#!/usr/bin/env bash
set -Eeuo pipefail

LOCK_FILE="/tmp/recomte-deploy.lock"
DEPLOY_DIR="/home/deploy/docker/recomte"
COMPOSE_FILE="docker/compose.yml"
MAX_RETRIES=5
VERSION_MAX_ATTEMPTS=40
VERSION_RETRY_INTERVAL=3

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
	echo "Another deploy is already running. Exiting."
	exit 0
fi

cd "${DEPLOY_DIR}"

echo "[deploy] Recording current container image IDs..."

declare -A OLD_IMAGE_IDS

while read -r CONTAINER_NAME IMAGE_ID; do
	OLD_IMAGE_IDS["$CONTAINER_NAME"]="$IMAGE_ID"
done < <(
	docker compose -f "${COMPOSE_FILE}" ps -q | while read -r CONTAINER_ID; do
		CONTAINER_NAME="$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's#^/##')"
		IMAGE_ID="$(docker inspect --format '{{.Image}}' "$CONTAINER_ID")"
		echo "$CONTAINER_NAME $IMAGE_ID"
	done
)

echo "[deploy] Pulling repository updates..."
git fetch origin
git reset --hard origin/main
git clean -fd
EXPECTED_COMMIT="$(git rev-parse HEAD)"
echo "[deploy] Expected application commit: ${EXPECTED_COMMIT}"

echo "[deploy] Pulling latest images..."
docker compose -f "${COMPOSE_FILE}" pull

echo "[deploy] Starting services..."

attempt=1
while true; do
	if docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans; then
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

echo "[deploy] Waiting for every production container to report ${EXPECTED_COMMIT}..."

version_attempt=1
while true; do
	mapfile -t APP_CONTAINER_IDS < <(docker compose -f "${COMPOSE_FILE}" ps -q app)
	all_containers_verified=true

	if [ "${#APP_CONTAINER_IDS[@]}" -eq 0 ]; then
		all_containers_verified=false
		echo "[deploy] No production app containers are available yet."
	fi

	for CONTAINER_ID in "${APP_CONTAINER_IDS[@]}"; do
		if ! docker exec \
			-e "EXPECTED_COMMIT=${EXPECTED_COMMIT}" \
			-e 'VERSION_URL=http://127.0.0.1:3000/api/version' \
			-e 'VERSION_VERIFY_TIMEOUT_MS=5000' \
			-e 'VERSION_VERIFY_INTERVAL_MS=0' \
			-e 'VERSION_VERIFY_REQUEST_TIMEOUT_MS=2000' \
			"${CONTAINER_ID}" node /app/scripts/verify-deployment-version.js; then
			all_containers_verified=false
			echo "[deploy] Container ${CONTAINER_ID} has not reached the expected commit."
		fi
	done

	if [ "${all_containers_verified}" = true ]; then
		echo "[deploy] Every production container reports ${EXPECTED_COMMIT}."
		break
	fi

	if [ "${version_attempt}" -ge "${VERSION_MAX_ATTEMPTS}" ]; then
		echo "[deploy] Deployment verification failed after ${VERSION_MAX_ATTEMPTS} attempts." >&2
		exit 1
	fi

	echo "[deploy] Retrying deployment verification (${version_attempt}/${VERSION_MAX_ATTEMPTS})..."
	version_attempt=$((version_attempt + 1))
	sleep "${VERSION_RETRY_INTERVAL}"
done

echo "[deploy] Checking for replaced images..."

declare -A REMOVED_IMAGES

while read -r CONTAINER_NAME NEW_IMAGE_ID; do
	OLD_IMAGE_ID="${OLD_IMAGE_IDS[$CONTAINER_NAME]:-}"

	if [ -n "$OLD_IMAGE_ID" ] && [ "$OLD_IMAGE_ID" != "$NEW_IMAGE_ID" ]; then
		if [ -z "${REMOVED_IMAGES[$OLD_IMAGE_ID]:-}" ]; then
			echo "[deploy] Container '$CONTAINER_NAME' changed image:"
			echo "          old=$OLD_IMAGE_ID"
			echo "          new=$NEW_IMAGE_ID"

			if docker image rm "$OLD_IMAGE_ID"; then
				echo "[deploy] Removed old image $OLD_IMAGE_ID"
			else
				echo "[deploy] Old image still in use or could not be removed: $OLD_IMAGE_ID"
			fi

			REMOVED_IMAGES["$OLD_IMAGE_ID"]=1
		fi
	fi
done < <(
	docker compose -f "${COMPOSE_FILE}" ps -q | while read -r CONTAINER_ID; do
		CONTAINER_NAME="$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's#^/##')"
		IMAGE_ID="$(docker inspect --format '{{.Image}}' "$CONTAINER_ID")"
		echo "$CONTAINER_NAME $IMAGE_ID"
	done
)

cd "${DEPLOY_DIR}"
./scripts/sync-test-db.sh

echo "[deploy] Completed successfully."
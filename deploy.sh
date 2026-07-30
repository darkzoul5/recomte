#!/usr/bin/env bash
set -Eeuo pipefail

LOCK_FILE="/tmp/recomte-deploy.lock"
DEPLOY_DIR="/home/deploy/docker/recomte"
COMPOSE_FILE="docker/compose.yml"
MAX_RETRIES=5

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

echo "[deploy] Completed successfully."

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
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-212.113.98.130}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/navigator}"
PLATFORM="${PLATFORM:-linux/amd64}"
WEB_IMAGE="${WEB_IMAGE:-navigator-web}"
WORKER_IMAGE="${WORKER_IMAGE:-navigator-worker}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
CADDY_FILE="${CADDY_FILE:-Caddyfile}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd docker
require_cmd ssh
require_cmd scp
require_cmd sshpass
require_cmd gzip

if [[ -z "${VPS_PASSWORD:-}" ]]; then
  read -r -s -p "VPS password for ${REMOTE_USER}@${REMOTE_HOST}: " VPS_PASSWORD
  echo
fi

if [[ ! -f "${ROOT_DIR}/${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${ROOT_DIR}/${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${ROOT_DIR}/${CADDY_FILE}" ]]; then
  echo "Caddyfile not found: ${ROOT_DIR}/${CADDY_FILE}" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

WEB_ARCHIVE="${TMP_DIR}/web-image.tar.gz"
WORKER_ARCHIVE="${TMP_DIR}/worker-image.tar.gz"

echo "Building ${WEB_IMAGE} for ${PLATFORM}..."
docker buildx build \
  --platform "${PLATFORM}" \
  --target runner-web \
  -t "${WEB_IMAGE}" \
  --load \
  "${ROOT_DIR}"

echo "Building ${WORKER_IMAGE} for ${PLATFORM}..."
docker buildx build \
  --platform "${PLATFORM}" \
  --target runner-worker \
  -t "${WORKER_IMAGE}" \
  --load \
  "${ROOT_DIR}"

echo "Packing images..."
docker save "${WEB_IMAGE}" | gzip > "${WEB_ARCHIVE}"
docker save "${WORKER_IMAGE}" | gzip > "${WORKER_ARCHIVE}"

echo "Preparing remote directory ${REMOTE_DIR}..."
export SSHPASS="${VPS_PASSWORD}"
SSH_OPTS=(
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
)
REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

sshpass -e ssh "${SSH_OPTS[@]}" "${REMOTE}" "mkdir -p '${REMOTE_DIR}'"

echo "Uploading compose, Caddyfile, and image archives..."
sshpass -e scp "${SSH_OPTS[@]}" \
  "${ROOT_DIR}/${COMPOSE_FILE}" \
  "${ROOT_DIR}/${CADDY_FILE}" \
  "${WEB_ARCHIVE}" \
  "${WORKER_ARCHIVE}" \
  "${REMOTE}:${REMOTE_DIR}/"

echo "Loading images and restarting services on VPS..."
sshpass -e ssh "${SSH_OPTS[@]}" "${REMOTE}" "REMOTE_DIR='${REMOTE_DIR}' COMPOSE_FILE='${COMPOSE_FILE}' bash -s" <<'EOF'
set -euo pipefail

cd "${REMOTE_DIR}"

gunzip -c web-image.tar.gz | docker load
gunzip -c worker-image.tar.gz | docker load
rm -f web-image.tar.gz worker-image.tar.gz

docker compose -f "${COMPOSE_FILE}" up -d rabbitmq
docker compose -f "${COMPOSE_FILE}" up -d --no-build --force-recreate web worker caddy
docker builder prune -af
docker compose -f "${COMPOSE_FILE}" ps
EOF

echo "Deployment completed."

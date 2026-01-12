#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

ENV_FILE="${SCRIPT_DIR}/vps.env"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

VPS_HOST="${VPS_HOST:?Set VPS_HOST in ${ENV_FILE} or environment}"
VPS_USER="${VPS_USER:-root}"
VPS_PORT="${VPS_PORT:-22}"
VPS_PATH="${VPS_PATH:-/opt/docker-projects/bestvpnserver}"

RSYNC_EXCLUDES=(
  --exclude ".git"
  --exclude "node_modules"
  --exclude ".pnpm-store"
  --exclude ".next"
  --exclude ".open-next"
  --exclude ".wrangler"
  --exclude "dist"
  --exclude "out"
  --exclude ".env"
  --exclude ".env.*"
  --exclude "apps/web/.codex-temp"
)

rsync -az "${RSYNC_EXCLUDES[@]}" \
  -e "ssh -p ${VPS_PORT}" \
  "${ROOT_DIR}/" \
  "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"

echo "Sync complete: ${VPS_USER}@${VPS_HOST}:${VPS_PATH}"

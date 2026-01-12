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

ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" <<EOF
set -euo pipefail
cd "${VPS_PATH}"

if command -v corepack >/dev/null 2>&1; then
  corepack enable
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
else
  echo "pnpm not found. Install Node.js + pnpm first."
  exit 1
fi

cd "${VPS_PATH}/infrastructure/central"
docker compose -f docker-compose.vps.yml up -d
EOF

echo "Remote setup complete."

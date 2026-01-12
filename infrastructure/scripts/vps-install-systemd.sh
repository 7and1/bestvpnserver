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

SYSTEMD_DIR="${ROOT_DIR}/infrastructure/central/systemd"

ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" "mkdir -p /tmp/bestvpnserver-systemd"
scp -P "${VPS_PORT}" "${SYSTEMD_DIR}"/bestvpnserver-*.service "${VPS_USER}@${VPS_HOST}:/tmp/bestvpnserver-systemd/"
scp -P "${VPS_PORT}" "${SYSTEMD_DIR}"/bestvpnserver-*.timer "${VPS_USER}@${VPS_HOST}:/tmp/bestvpnserver-systemd/"

ssh -p "${VPS_PORT}" "${VPS_USER}@${VPS_HOST}" <<EOF
set -euo pipefail
sudo mv /tmp/bestvpnserver-systemd/bestvpnserver-*.service /etc/systemd/system/
sudo mv /tmp/bestvpnserver-systemd/bestvpnserver-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bestvpnserver-db-maintenance.timer
sudo systemctl enable --now bestvpnserver-cache-refresh.timer
EOF

echo "Systemd timers installed on ${VPS_HOST}."

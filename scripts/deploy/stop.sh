#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

cd_root

for app in "${APPS_STOP_ORDER[@]}"; do
  pm2_stop_delete_app "${app}"
done

log "All Brasa PM2 processes stopped and removed."

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

cd_root

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  log "Installing dependencies"
  pnpm install
fi

if [[ "${SKIP_DB:-0}" != "1" ]]; then
  log "Running database migrations"
  pnpm db:migrate:prod

  if [[ "${SKIP_DB_SEED:-0}" != "1" ]]; then
    log "Seeding database"
    pnpm db:seed
  fi
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  log "Building all apps"
  pnpm build
fi

for app in "${APPS_START_ORDER[@]}"; do
  pm2_start_app "${app}"
done

log "Deploy complete. Run 'pnpm --filter @repo/<app> pm2:status' or 'pm2 list' to verify."

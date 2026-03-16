#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${1:-8084}"
WIPE_DATA="${2:-}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Run scripts/bootstrap-server.sh first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required."
  exit 1
fi

echo "Stopping and removing current DGC IMS containers..."
docker compose down --remove-orphans

echo "Removing DGC IMS containers if any remain..."
docker rm -f gov_chem_inv_db gov_chem_inv_api gov_chem_inv_web >/dev/null 2>&1 || true

if [[ "$WIPE_DATA" == "--wipe-data" ]]; then
  echo "Removing database volume dgc_ims_db_data..."
  docker volume rm dgc_ims_db_data >/dev/null 2>&1 || true
fi

echo "Rebuilding and redeploying on port $PORT..."
bash scripts/update-server.sh "$PORT"

echo "Clean redeploy complete."
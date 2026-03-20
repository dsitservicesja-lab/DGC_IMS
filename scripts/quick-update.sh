#!/bin/bash
# DGC IMS Quick Update - Pull from Git and rebuild
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CUSTOM_PORT="${1:-8084}"

cd "$APP_DIR"

echo "════════════════════════════════════════════"
echo "  DGC IMS Quick Update"
echo "════════════════════════════════════════════"

# Pull latest code (reset any local edits so pull never fails)
echo "[*] Pulling latest code from GitHub..."
git reset --hard HEAD
git pull origin main

# Ensure .env exists with all keys from .env.example
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[*] Created .env from .env.example"
else
  # Add any new keys from .env.example that are missing in .env
  while IFS= read -r line; do
    key="${line%%=*}"
    if [[ -n "$key" && "$key" != \#* && ! "$key" =~ ^[[:space:]]$ ]]; then
      grep -q "^${key}=" .env 2>/dev/null || echo "$line" >> .env
    fi
  done < .env.example
  echo "[*] .env updated with any new keys"
fi

# Rebuild and restart
echo "[*] Rebuilding Docker images (no cache)..."
docker compose build --no-cache

# Update port if needed
sed -i "s/- \"8080:80\"/- \"${CUSTOM_PORT}:80\"/g" docker-compose.yml 2>/dev/null || true

echo "[*] Restarting services..."
docker compose up -d

echo ""
echo "✓ Update complete!"
echo "  Web: http://$(hostname -I | awk '{print $1}'):${CUSTOM_PORT}"
echo "  API: http://$(hostname -I | awk '{print $1}'):4000/api/health"

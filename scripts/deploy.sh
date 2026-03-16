#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

read_env_value() {
  local key="$1"
  local file="$2"

  local raw
  raw=$(grep -E "^${key}=" "$file" | tail -1 | cut -d= -f2- || true)
  raw="${raw%\"}"
  raw="${raw#\"}"
  raw="${raw%\'}"
  raw="${raw#\'}"
  echo "$raw"
}

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from template. Update secrets before production use."
fi

echo "Pulling latest images and rebuilding services..."
docker compose pull || true
docker compose build --no-cache

echo "Applying database migrations..."
docker compose up -d db

DB_READY=false
for attempt in $(seq 1 30); do
  if docker compose exec -T db pg_isready >/dev/null 2>&1; then
    DB_READY=true
    break
  fi
  sleep 2
done

if [[ "$DB_READY" != "true" ]]; then
  echo "Database did not become ready in time."
  docker compose logs db | tail -50 || true
  exit 1
fi

MIGRATION_DATABASE_URL=$(read_env_value "DATABASE_URL" "$ROOT_DIR/.env")
if [[ -n "$MIGRATION_DATABASE_URL" ]]; then
  MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL//localhost/db}"
  MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL//127.0.0.1/db}"
  docker compose run --rm -e DATABASE_URL="$MIGRATION_DATABASE_URL" api npx prisma migrate deploy
else
  docker compose run --rm api npx prisma migrate deploy
fi

echo "Starting stack..."
docker compose up -d

echo "Deployment complete."
docker compose ps

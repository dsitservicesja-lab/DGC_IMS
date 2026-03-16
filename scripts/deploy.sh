#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from template. Update secrets before production use."
fi

echo "Pulling latest images and rebuilding services..."
docker compose pull || true
docker compose build --no-cache

echo "Applying database migrations..."
docker compose run --rm api npx prisma migrate deploy

echo "Starting stack..."
docker compose up -d

echo "Deployment complete."
docker compose ps

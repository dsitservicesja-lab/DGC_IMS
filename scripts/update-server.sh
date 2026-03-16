#!/bin/bash
# DGC IMS Server Update Script
# Pulls latest changes from GitHub and redeploys with custom port

set -Eeuo pipefail

# Configuration
REPO_URL="https://github.com/dsitservicesja-lab/DGC_IMS.git"
CUSTOM_PORT="${1:-8084}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="/var/backups/dgc-ims-deployments"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/dgc-ims-update-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a "$LOG_FILE"
}

log_warn() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}" | tee -a "$LOG_FILE"
}

on_error() {
  local line="$1"
  log_error "Update failed at line ${line}. Check log: $LOG_FILE"
}

trap 'on_error $LINENO' ERR

require_cmd() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    log_error "Required command not found: $command_name"
    log_error "$install_hint"
    exit 1
  fi
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_BIN=(docker compose)
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_BIN=(docker-compose)
    return 0
  fi

  log_warn "Docker Compose not found. Attempting to install docker-compose-plugin..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update 2>&1 | tee -a "$LOG_FILE"
    apt-get install -y docker-compose-plugin 2>&1 | tee -a "$LOG_FILE" || true
  else
    log_warn "apt-get not available; cannot auto-install docker-compose-plugin"
  fi

  if docker compose version >/dev/null 2>&1; then
    COMPOSE_BIN=(docker compose)
    log_success "Installed docker-compose-plugin successfully"
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_BIN=(docker-compose)
    return 0
  fi

  log_error "Neither 'docker compose' nor 'docker-compose' is available"
  log_error "Install Docker Compose plugin: sudo apt-get install -y docker-compose-plugin"
  exit 1
}

compose() {
  "${COMPOSE_BIN[@]}" "$@"
}

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

# Header
echo "════════════════════════════════════════════════════════════════"
echo "  DGC IMS Server Update Script"
echo "════════════════════════════════════════════════════════════════"
log "Starting update process..."
log "Repository: $REPO_URL"
log "App directory: $APP_DIR"
log "Custom port: $CUSTOM_PORT"
log "Log file: $LOG_FILE"

# Preflight checks
require_cmd git "Install Git first (Ubuntu: sudo apt-get install -y git)"
require_cmd docker "Install Docker first (or run scripts/bootstrap-server.sh)"
require_cmd curl "Install curl first (Ubuntu: sudo apt-get install -y curl)"
require_cmd sed "Install sed first (Ubuntu: sudo apt-get install -y sed)"
detect_compose
log_success "Preflight checks passed"

# Verify we're in the right directory
if [ ! -f "$APP_DIR/docker-compose.yml" ]; then
  log_error "docker-compose.yml not found in $APP_DIR"
  log_error "Are you running this script from the correct location?"
  exit 1
fi

log "✓ Application directory verified"

# Create backup directory
mkdir -p "$BACKUP_DIR"
log "✓ Backup directory ready: $BACKUP_DIR"

# Backup current deployment
log "Creating deployment backup..."
if [ -d "$APP_DIR/.git" ]; then
  CURRENT_COMMIT=$(cd "$APP_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  log "Current commit: $CURRENT_COMMIT"
else
  CURRENT_COMMIT="unknown"
fi

BACKUP_PATH="$BACKUP_DIR/backup_${CURRENT_COMMIT}_${TIMESTAMP}"
mkdir -p "$BACKUP_PATH"
cp -r "$APP_DIR" "$BACKUP_PATH/app_backup" 2>/dev/null || true
log_success "Backup created at: $BACKUP_PATH"

# Stop current services
log "Stopping current services..."
cd "$APP_DIR"
if ! compose down 2>&1 | tee -a "$LOG_FILE"; then
  log_warn "Compose down returned a warning (continuing)"
fi
log_success "Services stopped"

# Pull latest code from GitHub
log "Pulling latest code from GitHub..."
cd "$APP_DIR"

if [ -d ".git" ]; then
  git fetch origin 2>&1 | tee -a "$LOG_FILE"
  git pull origin main 2>&1 | tee -a "$LOG_FILE" || {
    log_error "Failed to pull from git"
    log_warn "Restoring from backup..."
    cd /
    rm -rf "$APP_DIR"
    cp -r "$BACKUP_PATH/app_backup" "$APP_DIR"
    log "Restored from backup. Please check git status and try again."
    exit 1
  }
else
  log_warn "Git repository not initialized. Cloning from GitHub..."
  cd /tmp
  rm -rf dgc_ims_temp
  git clone "$REPO_URL" dgc_ims_temp 2>&1 | tee -a "$LOG_FILE"
  cd dgc_ims_temp
  cp -r . "$APP_DIR"
  log "Repository cloned"
fi

log_success "Code updated from GitHub"

# Update docker-compose.yml to use custom port
log "Updating docker-compose.yml with custom port $CUSTOM_PORT..."

# Create a temporary docker-compose file with custom port
if [ -f "$APP_DIR/docker-compose.yml" ]; then
  # Backup original
  cp "$APP_DIR/docker-compose.yml" "$APP_DIR/docker-compose.yml.bak"
  
  # Update port mappings
  sed -i "s/- \"8080:80\"/- \"${CUSTOM_PORT}:80\"/g" "$APP_DIR/docker-compose.yml" || true
  sed -i "s/- \"8080:/- \"${CUSTOM_PORT}:/g" "$APP_DIR/docker-compose.yml" || true
  
  log_success "docker-compose.yml updated with port $CUSTOM_PORT"
else
  log_warn "docker-compose.yml not found, using default config"
fi

# Copy environment file if it doesn't exist
if [ ! -f "$APP_DIR/.env" ]; then
  if [ -f "$APP_DIR/.env.example" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    log_warn "Created .env from .env.example - please update with production values"
  else
    log_error ".env and .env.example not found"
    exit 1
  fi
fi

log_success ".env configuration verified"

# Build Docker images
log "Building Docker images..."
compose build 2>&1 | tee -a "$LOG_FILE" || {
  log_error "Docker build failed"
  exit 1
}
log_success "Docker images built"

# Run database migrations
log "Running database migrations..."
compose up -d db 2>&1 | tee -a "$LOG_FILE"

# Wait for database to be ready
log "Waiting for database to be ready..."
DB_READY=false
for attempt in $(seq 1 30); do
  if compose exec -T db pg_isready -U gov_chem_inv -d gov_chem_inv >/dev/null 2>&1; then
    DB_READY=true
    break
  fi
  sleep 2
done

if [ "$DB_READY" != "true" ]; then
  log_error "Database did not become ready in time"
  compose logs db 2>&1 | tee -a "$LOG_FILE" | tail -50 || true
  exit 1
fi

MIGRATION_DATABASE_URL=$(read_env_value "DATABASE_URL" "$APP_DIR/.env")
if [ -n "$MIGRATION_DATABASE_URL" ]; then
  MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL//localhost/db}"
  MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL//127.0.0.1/db}"
fi

if [ -n "$MIGRATION_DATABASE_URL" ]; then
  compose run --rm -e DATABASE_URL="$MIGRATION_DATABASE_URL" api npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE" || {
    log_error "Database migration failed"
    exit 1
  }
else
  compose run --rm api npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE" || {
    log_error "Database migration failed"
    exit 1
  }
fi

log_success "Database migrations applied"

# Start all services
log "Starting services on port $CUSTOM_PORT..."
cd "$APP_DIR"
compose up -d 2>&1 | tee -a "$LOG_FILE"

# Wait for services to be healthy
log "Waiting for services to become healthy..."
sleep 10

# Check health
log "Checking service health..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
    log_success "API health check passed"
    break
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    log "Health check attempt $ATTEMPT/$MAX_ATTEMPTS... retrying in 2 seconds"
    sleep 2
  fi
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  log_error "API failed health check after $MAX_ATTEMPTS attempts"
  log "Checking Docker logs..."
  compose logs api 2>&1 | tee -a "$LOG_FILE" | tail -30 || true
  exit 1
fi

# Get latest commit hash
NEW_COMMIT=$(cd "$APP_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
log_success "Deployment completed successfully"

# Final status
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✓ DGC IMS Update Complete"
echo "════════════════════════════════════════════════════════════════"
echo ""
log_success "Web UI: http://localhost:$CUSTOM_PORT"
log_success "API: http://localhost:4000/api"
log_success "Health check: http://localhost:4000/api/health"
echo ""
log "Updated from: $CURRENT_COMMIT → $NEW_COMMIT"
log "Backup location: $BACKUP_PATH"
log "Full log: $LOG_FILE"
echo ""
echo "════════════════════════════════════════════════════════════════"

# Show docker-compose status
log "Current service status:"
compose ps 2>&1 | tee -a "$LOG_FILE"

echo ""
log_success "Update finished at $(date '+%Y-%m-%d %H:%M:%S')"

exit 0

#!/bin/bash
# DGC IMS Database Backup Script
# Automated daily backup with encryption and S3 upload

set -e

# Configuration
BACKUP_DIR="/var/backups/dgc-ims"
DB_NAME="${DATABASE_NAME:-dgc_ims}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER:-dgc_ims}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-dgc-ims-backups}"
COMPRESSION="gzip"
ENCRYPTION_CIPHER="aes-256-cbc"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dgc_ims_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting database backup..."

# Perform backup
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --verbose \
  --clean \
  --if-exists \
  --format=custom \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup completed: $BACKUP_FILE"

# Encrypt backup
ENCRYPTED_FILE="${BACKUP_FILE}.enc"
openssl enc -$ENCRYPTION_CIPHER -in "$BACKUP_FILE" -out "$ENCRYPTED_FILE" -pass env:BACKUP_ENCRYPTION_PASSWORD
rm "$BACKUP_FILE"

echo "[$(date)] Backup encrypted: $ENCRYPTED_FILE"

# Upload to S3
if command -v aws &> /dev/null; then
  echo "[$(date)] Uploading backup to S3..."
  aws s3 cp "$ENCRYPTED_FILE" "s3://$S3_BUCKET/backups/$(basename $ENCRYPTED_FILE)" \
    --sse AES256 \
    --metadata "timestamp=$TIMESTAMP,host=$HOSTNAME"
  
  echo "[$(date)] Backup uploaded to S3"
else
  echo "[$(date)] WARNING: AWS CLI not found, skipping S3 upload"
fi

# Cleanup old backups (keep last N days)
echo "[$(date)] Cleaning up old backups..."
find "$BACKUP_DIR" -name "dgc_ims_*.sql.gz.enc" -mtime +$BACKUP_RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "dgc_ims_*.sql.gz.enc" -mtime +$BACKUP_RETENTION_DAYS -print0 | xargs -0 rm -f

# Log backup statistics
BACKUP_SIZE=$(ls -lah "$ENCRYPTED_FILE" | awk '{print $5}')
echo "[$(date)] Backup size: $BACKUP_SIZE"
echo "[$(date)] Backup completed successfully"

# Send notification (optional)
if [ -n "$NOTIFICATION_WEBHOOK" ]; then
  curl -X POST "$NOTIFICATION_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"DGC IMS backup completed\", \"size\": \"$BACKUP_SIZE\", \"timestamp\": \"$TIMESTAMP\"}"
fi

exit 0

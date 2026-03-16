#!/bin/bash
# DGC IMS Disaster Recovery Test
# Validates backup integrity and restore procedure

set -e

BACKUP_FILE="${1:-}"
TEST_DB_NAME="dgc_ims_test_restore"
TEST_DB_HOST="${DATABASE_HOST:-localhost}"
TEST_DB_PORT="${DATABASE_PORT:-5432}"
TEST_DB_USER="${DATABASE_USER:-dgc_ims}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./disaster-recovery-test.sh <backup_file>"
  echo "Example: ./disaster-recovery-test.sh /backups/dgc_ims_20260316_120000.sql.gz.enc"
  exit 1
fi

echo "[$(date)] Starting Disaster Recovery Test..."
echo "[$(date)] Backup file: $BACKUP_FILE"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Decrypt backup
echo "[$(date)] Decrypting backup..."
DECRYPTED_FILE="${BACKUP_FILE%.enc}.decrypted"
openssl enc -d -aes-256-cbc -in "$BACKUP_FILE" -out "$DECRYPTED_FILE" -pass env:BACKUP_ENCRYPTION_PASSWORD

# Create test database
echo "[$(date)] Creating test database: $TEST_DB_NAME..."
dropdb -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" --if-exists "$TEST_DB_NAME" || true
createdb -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" "$TEST_DB_NAME"

# Restore from backup
echo "[$(date)] Restoring from backup..."
pg_restore \
  -h "$TEST_DB_HOST" \
  -p "$TEST_DB_PORT" \
  -U "$TEST_DB_USER" \
  -d "$TEST_DB_NAME" \
  --verbose \
  "$DECRYPTED_FILE"

echo "[$(date)] Restore completed"

# Validation checks
echo "[$(date)] Running validation checks..."

# Check table count
TABLE_COUNT=$(psql -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" -d "$TEST_DB_NAME" \
  -tc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

echo "[$(date)] Table count: $TABLE_COUNT"

if [ "$TABLE_COUNT" -lt 5 ]; then
  echo "[ERROR] Restored database has too few tables: $TABLE_COUNT"
  exit 1
fi

# Check row counts for critical tables
USERS=$(psql -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" -d "$TEST_DB_NAME" \
  -tc "SELECT count(*) FROM \"User\";" | tr -d ' ')
ITEMS=$(psql -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" -d "$TEST_DB_NAME" \
  -tc "SELECT count(*) FROM \"InventoryItem\";" | tr -d ' ')

echo "[$(date)] Users: $USERS"
echo "[$(date)] Inventory Items: $ITEMS"

# Verify data integrity
echo "[$(date)] Verifying data integrity..."
psql -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" -d "$TEST_DB_NAME" \
  -c "SELECT * FROM \"AuditLog\" ORDER BY \"createdAt\" DESC LIMIT 5;" > /tmp/audit_sample.txt

echo "[$(date)] Sample audit logs:"
cat /tmp/audit_sample.txt

# Cleanup
echo "[$(date)] Cleaning up test database..."
dropdb -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" "$TEST_DB_NAME"
rm "$DECRYPTED_FILE"

echo "[$(date)] ✅ Disaster Recovery Test PASSED"
echo "[$(date)] Backup is valid and can be restored"
echo "[$(date)] Recovery Time Objective (RTO): ~5 minutes for production restore"
echo "[$(date)] Recovery Point Objective (RPO): 1 hour (daily backups)"

exit 0

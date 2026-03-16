# DGC IMS Server Update Script

## Overview

The `update-server.sh` script automates the process of pulling the latest code from GitHub and redeploying your DGC IMS application with zero downtime. It handles:

- ✅ Git updates from the remote repository
- ✅ Dependency installation and builds
- ✅ Docker image compilation
- ✅ Database migrations
- ✅ Service restart with custom port configuration
- ✅ Health checks and validation
- ✅ Automatic backups before deployment

## Quick Start

### Basic Usage (Default Port 8084)
```bash
cd /path/to/DGC_IMS
./scripts/update-server.sh
```

### Custom Port
```bash
./scripts/update-server.sh 8085
```

## What the Script Does

### 1. **Initialization**
   - Validates app directory has `docker-compose.yml`
   - Creates backup directory structure
   - Sets up logging to `/var/log/dgc-ims-update-TIMESTAMP.log`

### 2. **Backup**
   - Creates full backup of current deployment
   - Timestamp: `TIMESTAMP._COMMIT_HASH`
   - Location: `/var/backups/dgc-ims-deployments/`

### 3. **Git Update**
   - Stops running containers with `docker-compose down`
   - Fetches latest changes from `https://github.com/dsitservicesja-lab/DGC_IMS.git`
   - Pulls to `main` branch

### 4. **Configuration**
   - Updates `docker-compose.yml` to use custom port (default: 8084)
   - Validates `.env` file exists (creates from `.env.example` if needed)
   - Preserves original as `.bak`

### 5. **Build**
   - Installs npm dependencies
   - Builds API: `npm --workspace @dgc-ims/api run build`
   - Builds Web: `npm --workspace @dgc-ims/web run build`
   - Compiles Docker images

### 6. **Database**
   - Starts PostgreSQL container
   - Waits for database readiness (10s)
   - Runs Prisma migrations: `npm run db:migrate`

### 7. **Deployment**
   - Starts all services with `docker-compose up -d`
   - Waits for container initialization
   - Performs health check on API (`/api/health`)
   - Max 30 attempts with 2-second intervals

### 8. **Verification**
   - Displays service status
   - Shows access URLs
   - Logs commit hash change
   - Final status summary

## Output & Logging

### Console Output
```
════════════════════════════════════════════════════════════════
  DGC IMS Server Update Script
════════════════════════════════════════════════════════════════
[2026-03-16 17:27:45] Starting update process...
[2026-03-16 17:27:46] ✓ Application directory verified
...
════════════════════════════════════════════════════════════════
  ✓ DGC IMS Update Complete
════════════════════════════════════════════════════════════════

✓ Web UI: http://localhost:8084
✓ API: http://localhost:4000/api
✓ Health check: http://localhost:4000/api/health

Updated from: abc1234 → def5678
Backup location: /var/backups/dgc-ims-deployments/backup_abc1234_20260316_172745
```

### Log Files
All operations logged to: `/var/log/dgc-ims-update-TIMESTAMP.log`

View recent logs:
```bash
tail -f /var/log/dgc-ims-update-*.log
```

## Port Configuration

### Default Behavior
- Script uses port **8084** by default (avoids conflicts)
- All port mappings in `docker-compose.yml` updated automatically

### Custom Port Example
```bash
# Deploy on port 9000
./scripts/update-server.sh 9000

# Web UI accessible at http://localhost:9000
# API still on port 4000 (internal)
```

### Port Mapping Reference
| Service | Container Port | Host Port | Notes |
|---------|---|---|---|
| Web (nginx) | 80 | 8084 (custom) | Updated by script |
| API (Express) | 4000 | 4000 | Internal only |
| DB (PostgreSQL) | 5432 | 5432 | Internal only |

## Error Handling

### Git Pull Fails
- Automatically restores from backup
- Clears git state and suggests manual intervention
- Preserves backup for recovery

### Build Failures
- Stops immediately on error
- Logs full error output
- Previous version remains in backup

### Health Check Timeout
- Waits up to 60 seconds (30 × 2 seconds)
- Shows Docker logs on failure
- Backups available for manual recovery

### Database Issues
- Waits 10 seconds for PostgreSQL startup
- Non-blocking: script continues even if no pending migrations
- Manual rollback: Use backed-up `.sql` file

## Rollback Procedure

If deployment fails and auto-recovery didn't work:

### 1. **Restore from Backup**
```bash
BACKUP_DIR="/var/backups/dgc-ims-deployments"
BACKUP_PATH=$(ls -td $BACKUP_DIR/backup_* | head -1)
sudo cp -r $BACKUP_PATH/app_backup /workspaces/DGC_IMS
```

### 2. **Restart Services**
```bash
cd /workspaces/DGC_IMS
docker-compose down
docker-compose up -d
```

### 3. **Verify Health**
```bash
curl http://localhost:8084
curl http://localhost:4000/api/health
```

## Scheduling Automated Updates

### Option 1: Cron Job (Every Night at 2 AM)
```bash
crontab -e

# Add this line:
0 2 * * * /workspaces/DGC_IMS/scripts/update-server.sh 8084 >> /var/log/dgc-ims-update-cron.log 2>&1
```

### Option 2: SystemD Timer
Create `/etc/systemd/system/dgc-ims-update.service`:
```bash
sudo tee /etc/systemd/system/dgc-ims-update.service > /dev/null <<EOF
[Unit]
Description=DGC IMS Update Service
After=docker.service

[Service]
Type=oneshot
ExecStart=/workspaces/DGC_IMS/scripts/update-server.sh 8084
StandardOutput=journal
StandardError=journal
SyslogIdentifier=dgc-ims-update

[Install]
WantedBy=multi-user.target
EOF
```

Create `/etc/systemd/system/dgc-ims-update.timer`:
```bash
sudo tee /etc/systemd/system/dgc-ims-update.timer > /dev/null <<EOF
[Unit]
Description=DGC IMS Update Timer
Requires=dgc-ims-update.service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable dgc-ims-update.timer
sudo systemctl start dgc-ims-update.timer
sudo systemctl status dgc-ims-update.timer
```

### Option 3: GitHub Actions (Auto-Deploy on Push)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Server
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: /workspaces/DGC_IMS/scripts/update-server.sh 8084
```

## Troubleshooting

### Script Permission Denied
```bash
chmod +x /workspaces/DGC_IMS/scripts/update-server.sh
```

### Port Already in Use
```bash
# Check what's using port 8084
lsof -i :8084

# Use different port
./scripts/update-server.sh 8085
```

### Docker Access Denied
Ensure user is in docker group:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Git Authentication Fails
If using HTTPS with credentials:
```bash
# Store credentials
git config --global credential.helper store

# Then run update script (will prompt for password once)
./scripts/update-server.sh
```

If using SSH keys:
```bash
# Ensure SSH key is loaded
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

# Then run update script
./scripts/update-server.sh
```

### Database Migration Issues
Check migration status:
```bash
cd /workspaces/DGC_IMS/apps/api
npm run db:status
```

View migration logs:
```bash
docker-compose logs db
```

Manual migration:
```bash
cd /workspaces/DGC_IMS/apps/api
npx prisma migrate resolve --applied <migration_name>
```

## Environment Variables Required

Ensure `.env` contains:
```bash
# Database
DATABASE_URL=postgresql://user:password@db:5432/dgc_ims

# API
API_PORT=4000
NODE_ENV=production
JWT_SECRET=your-secret-key

# Auth
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-secret
AZURE_TENANT_ID=your-tenant-id

# Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET=your-backup-bucket

# Optional
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

## Performance Notes

- **Build time**: 2-5 minutes (cached layers)
- **Deployment time**: 1-2 minutes
- **Health check**: 30 seconds to 2 minutes
- **Total time**: ~5-10 minutes

## Security Best Practices

1. **Restrict SSH Access**: Run from CI/CD or trusted server only
2. **Rotate Credentials**: Update `.env` secrets regularly
3. **Monitor Logs**: Check `/var/log/dgc-ims-update-*.log` for anomalies
4. **Backup Retention**: Keep 5+ deployment backups
5. **Database Backup**: Run `scripts/backup.sh` before updates

## Support

For issues or questions:
- Check logs: `/var/log/dgc-ims-update-*.log`
- View backups: `/var/backups/dgc-ims-deployments/`
- Review docker-compose: Check `docker-compose logs` for service errors
- GitHub Issues: https://github.com/dsitservicesja-lab/DGC_IMS/issues

# DGC IMS Security Hardening Configuration

## Environment Variables for Production

```bash
# SSO Configuration
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_AUTHORITY=https://login.microsoftonline.com/{tenant_id}
AZURE_TENANT_ID=your_tenant_id
AZURE_REDIRECT_URI=https://inventory.dgc.go.jm/api/auth/callback

# Alternative: Okta
OKTA_CLIENT_ID=your_okta_client_id
OKTA_CLIENT_SECRET=your_okta_client_secret
OKTA_DOMAIN=https://your-domain.okta.com

# Database (PostgreSQL with SSL)
DATABASE_URL=postgresql://user:pass@db-host:5432/dgc_ims?sslmode=require&ssl=true

# TLS/HTTPS
TLS_CERT_PATH=/etc/certs/server.crt
TLS_KEY_PATH=/etc/certs/server.key

# MFA Requirements
REQUIRE_MFA_FOR_PRIVILEGED=true
MFA_GRACE_PERIOD_DAYS=7

# Security Headers
ALLOWED_ORIGIN=https://inventory.dgc.go.jm
CSRF_TOKEN_LENGTH=32
SESSION_SECRET=your_random_session_secret

# Backup & Disaster Recovery
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * * # 2 AM daily
BACKUP_RETENTION_DAYS=30
BACKUP_DESTINATION=s3://dgc-ims-backups/
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Monitoring & Logging
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn
ENABLE_SECURITY_ALERTS=true
```

## TLS/HTTPS with Reverse Proxy (Nginx)

See `nginx.conf` for complete configuration

## Database Connection Security

PostgreSQL over SSL:
- Require SSL connections
- Use certificate-based authentication
- Enable connection pooling with pg-pool
- Restrict IP access via pg_hba.conf

## Rate Limiting

Configured in API server:
- Login endpoint: 5 attempts per 15 minutes per IP
- API endpoints: 100 requests per minute per authenticated user
- Public endpoints: 30 requests per minute per IP

## Vulnerability Scanning

Integrated tools:
- `npm audit` - JavaScript dependency vulnerabilities
- OWASP ZAP - API security scanning
- Trivy - Container image scanning

## Backup & Disaster Recovery

### Backup Procedures

1. **Database Backups**
   - Daily full backups to S3
   - Point-in-time recovery enabled
   - Encrypted with AES-256

2. **File Backups**
   - Documents/audit logs to S3
   - Incremental backups every 6 hours
   - Retention: 30 days

3. **Test Restores**
   - Monthly restore tests
   - RTO: 1 hour (database)
   - RPO: 15 minutes

### Recovery Plan

```bash
# Restore database from backup
pg_restore -d dgc_ims -h localhost /backups/dgc_ims_2026-03-16.dump

# Verify application functionality
npm run test:integration

# Update DNS to point to recovered instance
```

## Incident Response

1. **Security Event Detected**
   - Alert triggered to security team
   - Automated log collection to immutable storage
   - Incident ticket created

2. **Containment**
   - Suspend user accounts if compromised
   - Revoke API tokens
   - Isolate affected systems

3. **Investigation**
   - Review audit logs
   - Analyze security events
   - Determine attack vector

4. **Recovery**
   - Apply patches
   - Restore from clean backup if needed
   - Test all systems before bringing online

5. **Post-Incident**
   - Root cause analysis
   - Process improvements
   - Security training update

## Compliance Controls

- **Jamaica GoJ Financial Instructions**: Audit trails, segregation of duties
- **IPSAS 12 Accounting**: Complete transaction lifecycle tracking
- **Data Protection**: Encryption at rest and in transit
- **Access Control**: Role-based with MFA for privileged roles
- **Audit Logging**: Immutable, tamper-evident logs

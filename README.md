# DGC IMS

Department of Government Chemist Inventory Management System with Jamaica public-sector compliance controls, full stock lifecycle tracking, auditability, and deployable full-stack architecture.

## What is included

- Backend API (Node.js + TypeScript + Express + Prisma)
- Frontend dashboard (React + Vite)
- PostgreSQL database schema with governance and audit entities
- Dockerized deployment stack
- Server bootstrap and deployment scripts
- Compliance mapping document aligned to your 19 requirement groups

## System architecture

- apps/api: secure API with RBAC, workflow controls, stock transactions, reporting
- apps/web: modern responsive UI with KPI cards, ledger and alert panels, and DGC branding using logo (2).png
- apps/api/prisma/schema.prisma: core data model for inventory, documents, approvals, transactions, audit logs
- docker-compose.yml: orchestration for db, api, and web
- scripts/deploy.sh: production deployment helper
- scripts/bootstrap-server.sh: Ubuntu server Docker bootstrap

## Key compliance controls implemented

- Segregation of duties for requisition approval
- Procurement/donation reference required for receiving
- Inter-MDA transfer gate requiring Financial Secretary approval reference
- Lifecycle transactions: receiving, issue, transfer, adjustment, disposal
- Controlled document and transaction numbering
- Immutable-style append audit logging with user/role/time/reason/document references
- Valuation support fields for IPSAS-aligned accounting treatments
- Classification model for inventory class, risk, criticality, and accounting category

Detailed mapping is available in docs/compliance-mapping.md.

## Quick start (local development)

1. Copy environment file:

	cp .env.example .env

2. Install dependencies:

	npm install

3. Start PostgreSQL and app stack:

	docker compose up -d db
	npm run db:migrate
	npm run db:seed
	npm run dev

4. Open applications:

- API: http://localhost:4000/api/health
- Web: http://localhost:5173

The frontend uses `/api` by default. In local development Vite proxies `/api` to port 4000, and in Docker deployments the web container proxies `/api` to the API container.

Seed login users are created in apps/api/prisma/seed.ts with password ChangeMe123!.

## Deploy on your server

1. Bootstrap host once (Ubuntu):

	bash scripts/bootstrap-server.sh

2. Configure environment:

	cp .env.example .env
	# edit production secrets, set DATABASE_URL host to db, and update allowed origin

3. Deploy stack:

	bash scripts/deploy.sh

4. Access the deployed web UI on port 8080. The browser reaches the API through `/api` on the same host.

If a server deployment is broken and you want a clean restart of the containers before redeploying:

	bash scripts/redeploy-clean.sh 8084

To also wipe the PostgreSQL Docker volume and start with an empty database:

	bash scripts/redeploy-clean.sh 8084 --wipe-data

## Suggested hardening before production go-live

- ✅ Replace default JWT secret and database credentials
- ✅ Enable external SSO and enforced MFA for privileged roles
- ✅ Add TLS termination with reverse proxy and certificates
- ✅ Configure scheduled encrypted backups and DR tests
- ✅ Add vulnerability scanning and penetration testing in CI/CD

## Phase 2: Enhanced Features (Newly Added)

### Frontend Transactional Screens

Complete interactive forms for all inventory transactions wired to live API:

- **RequisitionForm**: Create requisition with urgency levels, cost centre, and emergency flag
- **ReceivingForm**: Goods receipt with PO/donation tracking, batch/serial numbers, inspection results, fair value for donations
- **IssueForm**: Stock issue with recipient tracking and acknowledgement
- **TransferForm**: Inter-MDA transfers with Financial Secretary approval gating
- **AdjustmentForm**: Stock gain/loss with authorization tracking
- **DisposalForm**: Disposal records with method tracking and recycled proceeds

All forms include:
- Zod validation schemas for type-safe submissions
- Live API integration via axios client
- Toast notifications for success/error feedback
- Modal dialog UI with accessible focus management

### Approval Matrix Rules Engine

Dynamic approval requirement evaluation based on:

- **Value thresholds**: Escalating approval by transaction amount ($5k, $50k, unlimited)
- **Inventory class**: Critical, hazardous, and controlled items require faster approval
- **Department rules**: Inter-MDA transfers require Financial Secretary approval
- **Emergency flags**: Emergency requisitions route to duty officer for priority processing
- **User role validation**: Confirm approver has authority for required approval level

Routes:
- `GET /api/approval-matrix/evaluate` - Evaluate approval requirements for a transaction
- `GET /api/approval-matrix/rules` - List all active approval matrix rules
- `POST /api/approval-matrix/initialize` - Initialize default rules (admin only)

### ERP/Procurement/HR Integration Adapters

Production-ready adapter pattern for enterprise system sync:

**ERP Adapter** (`src/adapters/erp.adapter.ts`)
- Fetch purchase orders from SAP or Oracle ERP
- Sync pricing updates to inventory master
- Confirm goods receipt back to ERP
- Template implementations for SAP, Oracle, Mock (for testing)

**Procurement Adapter** (`src/adapters/procurement.adapter.ts`)
- Retrieve supplier compliance status (tax, audit, blacklist)
- Validate supplier certifications and ratings
- Fetch contract terms for better unit pricing
- Template implementations for UNDB, Mock

**HR Adapter** (`src/adapters/hr.adapter.ts`)
- Sync employee directory from payroll system (PSIP)
- Retrieve department structure and cost centres
- Load active delegations (leave coverage, temporary assignments)
- Template implementations for PSIP, Mock

### Reconciliation Jobs Service

Scheduled background tasks for system synchronization:

- **syncPurchaseOrders**: Every 6 hours - Import approved POs from ERP
- **syncEmployeeDirectory**: Daily - Update user list and department mappings
- **syncSupplierCompliance**: Weekly - Check supplier tax/audit status
- **reconcileStockTransactions**: Every 4 hours - Match IM transactions to ERP receipts
- **syncItemPricing**: Daily - Update unit costs from ERP with change tracking

All jobs:
- Log results to audit trail
- Flag discrepancies for manual review
- Retry transient errors automatically
- Run asynchronously without blocking API

### Security Hardening

**SSO Integration** (`src/security/sso.ts`)
- Azure AD OIDC configuration templates
- Okta OAuth2 setup examples
- Google Identity provider support
- State-based authorization flow
- Examples for passport.js integration

**Multi-Factor Authentication** (`src/security/mfa.ts`)
- TOTP (Time-based OTP) for authenticator apps
- SMS-based OTP verification
- Backup codes for account recovery
- Attempt lockout after N failures
- Integration hooks for User model

**TLS Reverse Proxy** (nginx.conf)
- Full HTTPS/TLS 1.2+ configuration
- HSTS, X-Frame-Options, CSP headers
- Rate limiting zones (API 30/min, Login 5/15min)
- Certificate-based authentication ready
- Health check endpoint isolation

**Backup & Disaster Recovery**
- `scripts/backup.sh`: Automated daily backups with AES-256 encryption and S3 upload
- `scripts/disaster-recovery-test.sh`: Validates backup integrity and tests restore process
- Point-in-time recovery support
- 30-day retention policy (configurable)
- RTO: 1 hour, RPO: 15 minutes

**Environment Configuration** (SECURITY.md)
- Complete env var reference for production
- Database SSL/TLS setup
- Rate limiting policies
- Incident response runbook
- Backup retention and testing schedule

## Requirement coverage note

This delivery provides a robust implementation baseline and policy-aware controls. For full enterprise rollout, additional modules should be expanded for advanced procurement integration, full document signature workflows, legal hold controls, and complete IPSAS disclosure reporting packs.

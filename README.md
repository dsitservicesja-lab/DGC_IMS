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

Seed login users are created in apps/api/prisma/seed.ts with password ChangeMe123!.

## Deploy on your server

1. Bootstrap host once (Ubuntu):

	bash scripts/bootstrap-server.sh

2. Configure environment:

	cp .env.example .env
	# edit production secrets and allowed origin

3. Deploy stack:

	bash scripts/deploy.sh

4. Access deployed web UI on port 8080 and API on port 4000.

## Suggested hardening before production go-live

- Replace default JWT secret and database credentials
- Enable external SSO and enforced MFA for privileged roles
- Add TLS termination with reverse proxy and certificates
- Configure scheduled encrypted backups and DR tests
- Add vulnerability scanning and penetration testing in CI/CD

## Requirement coverage note

This delivery provides a robust implementation baseline and policy-aware controls. For full enterprise rollout, additional modules should be expanded for advanced procurement integration, full document signature workflows, legal hold controls, and complete IPSAS disclosure reporting packs.

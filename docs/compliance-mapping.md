# DGC IMS Compliance Mapping (Jamaica Public Sector)

## 1. Legal and policy alignment
- Asset lifecycle coverage implemented in domain entities and transaction routes: requisition, purchase linkage, receiving, put-away stock state, issuing, transfer, adjustment, disposal.
- Full audit trail with immutable-style append logging implemented in AuditLog model and middleware.
- Procurement and donation references enforced before receiving finalization.
- Inter-MDA transfer flow requires Financial Secretary approval reference.
- Transaction and document references retained for audit and investigations.

## 2. Scope and classification
- Inventory classes, criticality, risk, accounting classes represented as enums in database schema.
- Supports expendables, controlled items, hazardous and expiry-sensitive items, donations, reserve stock, write-down candidates.

## 3. Governance and segregation of duties
- Role model includes Accounting Officer, Asset Manager, Storekeeper, Requisitioning, Receiving, Approving, Procurement, Finance, Disposal Authority, Internal Auditor, System Admin, Custodian.
- Requisition approval enforces requester/approver separation.
- Adjustment and disposal actions require elevated role authorization.
- Delegation model with validity period included.

## 4. Master data quality
- Item master fields include identifiers, classification, valuation, procurement links, controls, and policy flags.
- Location master includes hierarchy, security level, environmental requirements, and custodian assignment.
- User/org metadata includes role, department, approval level, login attributes, and active dates.

## 5. Core processes
- Requisition workflow supports urgency, justification, destination, duplicate/excessive detection, and stock check.
- Receiving supports PO or donation matching, accepted/rejected quantities, batch/serial/expiry attributes, quarantine and fair value capture.
- Issue, transfer, adjustment, disposal workflows support reason codes and controlled approvals.

## 6. Document control
- Unique document/transaction numbering implemented.
- Linked document references required for controlled transactions.
- Approval evidence captured by authority references and audit entries.

## 7. Accounting and valuation
- Valuation methods supported: weighted average, FIFO, specific identification.
- Non-exchange fair value capture available at receiving.
- Item model supports replacement cost and accounting classes for IPSAS treatment.

## 8. Planning and replenishment
- Reorder, min/max, safety stock, lead time and EOQ fields available.
- KPI and stock rule checks support reorder decisions.

## 9-13. Security, verification, quality, traceability, cyber
- RBAC, JWT authentication, role-gated endpoints, and optional MFA policy enforcement middleware.
- Batch, serial, expiry and movement history represented in receipt and transaction data.
- Audit-exception reporting endpoint included.

## 14. Reporting
- KPI endpoint, stock ledger endpoint, audit exception report endpoint.
- Frontend dashboard visualizes operational and control KPIs.

## 15-19. Integration, records, continuity, usability, architecture
- API-capable architecture ready for ERP/procurement integration.
- Dockerized deployment with PostgreSQL persistence and backup-compatible volume.
- Responsive web UI with role-friendly panels and quick actions.
- Records and logs retained in centralized relational database.

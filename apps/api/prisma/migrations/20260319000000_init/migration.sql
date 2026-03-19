-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ACCOUNTING_OFFICER', 'ASSET_MANAGER', 'STOREKEEPER', 'REQUISITIONING_OFFICER', 'RECEIVING_OFFICER', 'APPROVING_OFFICER', 'PROCUREMENT_OFFICER', 'FINANCE_OFFICER', 'DISPOSAL_AUTHORITY', 'INTERNAL_AUDITOR', 'SYSTEM_ADMIN', 'CUSTODIAN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('REQUISITION', 'PURCHASE_ORDER', 'GOODS_RECEIVED_NOTE', 'INSPECTION_REPORT', 'STOCK_ISSUE_VOUCHER', 'TRANSFER_NOTE', 'ADJUSTMENT_NOTE', 'STOCK_COUNT_SHEET', 'VARIANCE_REPORT', 'QUARANTINE_NOTE', 'DISPOSAL_FORM', 'RETURN_TO_SUPPLIER', 'DONATION_ACCEPTANCE', 'INCIDENT_REPORT');

-- CreateEnum
CREATE TYPE "InventoryClass" AS ENUM ('CONSUMABLES', 'OFFICE_SUPPLIES', 'CLEANING_SUPPLIES', 'LABORATORY_SUPPLIES', 'CHEMICALS_REAGENTS', 'PPE_SAFETY', 'SPARE_PARTS', 'MAINTENANCE_STOCK', 'UNIFORMS', 'IT_CONSUMABLES', 'CONTROLLED_STATIONERY', 'GOODS_FOR_DISTRIBUTION', 'GOODS_FOR_RESALE', 'WORK_IN_PROGRESS');

-- CreateEnum
CREATE TYPE "CriticalityClass" AS ENUM ('CRITICAL', 'ESSENTIAL', 'ROUTINE', 'OBSOLETE_PENDING_DISPOSAL', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "RiskClass" AS ENUM ('HIGH_VALUE', 'CONTROLLED', 'HAZARDOUS', 'EXPIRY_SENSITIVE', 'SERIALIZED', 'REGULATED', 'DONATED', 'EMERGENCY_RESERVE');

-- CreateEnum
CREATE TYPE "AccountingClass" AS ENUM ('EXCHANGE_PURCHASED', 'NON_EXCHANGE_DONATION', 'NOMINAL_DISTRIBUTION', 'WRITE_DOWN_CANDIDATE', 'DAMAGED_LOST_SHRINKAGE', 'DISPOSAL_STOCK');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'OBSOLETE', 'QUARANTINED', 'DISPOSAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ValuationMethod" AS ENUM ('WEIGHTED_AVERAGE', 'FIFO', 'SPECIFIC_IDENTIFICATION');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECEIPT', 'ISSUE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_GAIN', 'ADJUSTMENT_LOSS', 'DISPOSAL', 'WRITE_DOWN');

-- CreateEnum
CREATE TYPE "ApprovalLevel" AS ENUM ('NONE', 'DUTY_OFFICER', 'SENIOR_OFFICER', 'DIRECTOR', 'FINANCIAL_SECRETARY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "department" TEXT NOT NULL,
    "approvalLevel" INTEGER NOT NULL DEFAULT 1,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "loginMethod" TEXT NOT NULL DEFAULT 'LOCAL',
    "activeFrom" TIMESTAMP(3) NOT NULL,
    "activeTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "floor" TEXT,
    "room" TEXT,
    "bin" TEXT,
    "securityLevel" TEXT NOT NULL,
    "tempRequirement" TEXT,
    "humidityReq" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "custodianId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "standardName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "InventoryClass" NOT NULL,
    "subcategory" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "packSize" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "manufacturer" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "partNumber" TEXT,
    "serialNumberFlag" BOOLEAN NOT NULL DEFAULT false,
    "batchNumberFlag" BOOLEAN NOT NULL DEFAULT false,
    "expiryDateFlag" BOOLEAN NOT NULL DEFAULT false,
    "hazardClassFlag" BOOLEAN NOT NULL DEFAULT false,
    "storageCondition" TEXT,
    "contractReference" TEXT,
    "procurementMethodReference" TEXT,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 0,
    "minLevel" INTEGER NOT NULL DEFAULT 0,
    "maxLevel" INTEGER NOT NULL DEFAULT 0,
    "safetyStock" INTEGER NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "economicOrderQty" INTEGER,
    "standardCost" DECIMAL(14,2) NOT NULL,
    "lastCost" DECIMAL(14,2),
    "averageCost" DECIMAL(14,2) NOT NULL,
    "valuationMethod" "ValuationMethod" NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
    "fundingSource" TEXT,
    "programCode" TEXT,
    "glCode" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuePolicy" TEXT NOT NULL DEFAULT 'UNRESTRICTED',
    "shelfLifeDays" INTEGER,
    "inspectionRequired" BOOLEAN NOT NULL DEFAULT false,
    "receivingTolerancePercent" INTEGER NOT NULL DEFAULT 0,
    "assetInventoryBoundaryFlag" BOOLEAN NOT NULL DEFAULT false,
    "criticalityClass" "CriticalityClass" NOT NULL DEFAULT 'ROUTINE',
    "riskClass" "RiskClass",
    "accountingClass" "AccountingClass" NOT NULL DEFAULT 'EXCHANGE_PURCHASED',
    "isDonated" BOOLEAN NOT NULL DEFAULT false,
    "currentReplacementCost" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "quantityQuarantine" INTEGER NOT NULL DEFAULT 0,
    "quantityDisposed" INTEGER NOT NULL DEFAULT 0,
    "lastVerifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisition" (
    "id" TEXT NOT NULL,
    "reqNumber" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "approverId" TEXT,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costCentre" TEXT NOT NULL,
    "intendedUse" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "destinationLocationId" TEXT NOT NULL,
    "emergencyFlag" BOOLEAN NOT NULL DEFAULT false,
    "emergencyReasonCode" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "duplicateFlag" BOOLEAN NOT NULL DEFAULT false,
    "excessiveFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "requisitionId" TEXT,
    "procurementMethod" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "contractReference" TEXT,
    "taxComplianceStatus" TEXT,
    "approvedBy" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL,
    "fsApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "fsApprovalReference" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "poNumber" TEXT,
    "donorSource" TEXT,
    "itemId" TEXT NOT NULL,
    "receivedLocationId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL,
    "quantityAccepted" INTEGER NOT NULL,
    "quantityRejected" INTEGER NOT NULL,
    "quantityDamaged" INTEGER NOT NULL,
    "lotBatchNumber" TEXT,
    "serialNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "manufacturerDate" TIMESTAMP(3),
    "inspectionResult" TEXT NOT NULL,
    "quarantineRequired" BOOLEAN NOT NULL DEFAULT false,
    "fairValue" DECIMAL(14,2),
    "valuationBasis" TEXT,
    "receivedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(14,2),
    "totalCost" DECIMAL(14,2),
    "reasonCode" TEXT,
    "linkedDocumentId" TEXT,
    "performedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "fsApprovalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisposalRecord" (
    "id" TEXT NOT NULL,
    "disposalNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "surveyRecordReference" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "authorityApprovalRef" TEXT NOT NULL,
    "proceeds" DECIMAL(14,2),
    "evidenceAttachment" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisposalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "reasonCode" TEXT,
    "linkedDocument" TEXT,
    "approvalReference" TEXT,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ipAddress" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalMatrixRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valueThreshold" DECIMAL(14,2),
    "approvalLevel" "ApprovalLevel" NOT NULL,
    "approverRoles" TEXT[],
    "transactionType" "TransactionType",
    "inventoryClass" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalMatrixRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRecord" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "immutableHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_itemCode_key" ON "InventoryItem"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_itemId_locationId_key" ON "StockBalance"("itemId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Requisition_reqNumber_key" ON "Requisition"("reqNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_grnNumber_key" ON "GoodsReceipt"("grnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransaction_transactionNumber_key" ON "StockTransaction"("transactionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DisposalRecord_disposalNumber_key" ON "DisposalRecord"("disposalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRecord_documentNumber_key" ON "DocumentRecord"("documentNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_receivedLocationId_fkey" FOREIGN KEY ("receivedLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalRecord" ADD CONSTRAINT "DisposalRecord_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


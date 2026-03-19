import { Router } from "express";
import { Prisma, TransactionType, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { logAudit } from "../middleware/audit.js";
import { docNumber } from "../utils/id.js";
import {
  ensureAdjustmentAuthority,
  ensureInterMdaTransferApproval,
  ensureProcurementReference,
  postStockTransaction
} from "../services/compliance.service.js";
import { AppError } from "../utils/errors.js";

export const transactionRouter = Router();
transactionRouter.use(requireAuth);

/* ── GET /transactions ── list recent stock transactions ── */
transactionRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const transactions = await prisma.stockTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        item: { select: { description: true } },
      },
    });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

const receivingSchema = z.object({
  poNumber: z.string().optional(),
  donorSource: z.string().optional(),
  itemId: z.string().cuid(),
  receivedLocationId: z.string().cuid(),
  quantityOrdered: z.number().int().nonnegative(),
  quantityReceived: z.number().int().positive(),
  quantityAccepted: z.number().int().nonnegative(),
  quantityRejected: z.number().int().nonnegative(),
  quantityDamaged: z.number().int().nonnegative(),
  lotBatchNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  inspectionResult: z.string().min(2),
  quarantineRequired: z.boolean().default(false),
  fairValue: z.number().nonnegative().optional(),
  valuationBasis: z.string().optional()
});

transactionRouter.post(
  "/receiving",
  requireRoles([
    UserRole.RECEIVING_OFFICER,
    UserRole.STOREKEEPER,
    UserRole.ASSET_MANAGER,
    UserRole.PROCUREMENT_OFFICER
  ]),
  async (req, res, next) => {
    try {
      const payload = receivingSchema.parse(req.body);
      await ensureProcurementReference(payload.poNumber, payload.donorSource);

      const grn = await prisma.goodsReceipt.create({
        data: {
          ...payload,
          grnNumber: docNumber("GRN"),
          expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : undefined,
          fairValue: payload.fairValue ? new Prisma.Decimal(payload.fairValue) : undefined,
          receivedById: req.user!.id,
          manufacturerDate: null
        }
      });

      const stock = await prisma.stockBalance.upsert({
        where: {
          itemId_locationId: {
            itemId: payload.itemId,
            locationId: payload.receivedLocationId
          }
        },
        update: {
          quantityOnHand: { increment: payload.quantityAccepted },
          quantityQuarantine: payload.quarantineRequired ? { increment: payload.quantityRejected + payload.quantityDamaged } : undefined
        },
        create: {
          itemId: payload.itemId,
          locationId: payload.receivedLocationId,
          quantityOnHand: payload.quantityAccepted,
          quantityQuarantine: payload.quarantineRequired ? payload.quantityRejected + payload.quantityDamaged : 0
        }
      });

      const tx = await postStockTransaction({
        transactionNumber: docNumber("TX"),
        type: TransactionType.RECEIPT,
        itemId: payload.itemId,
        fromLocationId: null,
        toLocationId: payload.receivedLocationId,
        quantity: payload.quantityAccepted,
        unitCost: payload.fairValue ? new Prisma.Decimal(payload.fairValue) : null,
        totalCost: payload.fairValue
          ? new Prisma.Decimal(payload.fairValue * payload.quantityAccepted)
          : null,
        reasonCode: payload.donorSource ? "NON_EXCHANGE_RECEIPT" : "PO_RECEIPT",
        linkedDocumentId: grn.grnNumber,
        performedById: req.user!.id,
        approvedById: null,
        fsApprovalRef: null
      });

      await logAudit(req, "RECEIVE", "GoodsReceipt", grn.id, undefined, { grn, stock, tx }, undefined, grn.grnNumber);
      res.status(201).json({ grn, stock, tx });
    } catch (error) {
      next(error);
    }
  }
);

const issueSchema = z.object({
  itemId: z.string().cuid(),
  fromLocationId: z.string().cuid(),
  quantity: z.number().int().positive(),
  reasonCode: z.string().min(2),
  issueToType: z.enum(["PERSON", "DEPARTMENT", "PROJECT", "EVENT", "VEHICLE", "BUILDING", "ROOM"]),
  issueToReference: z.string().min(1),
  acknowledgement: z.string().min(2)
});

transactionRouter.post(
  "/issue",
  requireRoles([
    UserRole.STOREKEEPER,
    UserRole.ASSET_MANAGER,
    UserRole.CUSTODIAN
  ]),
  async (req, res, next) => {
    try {
      const payload = issueSchema.parse(req.body);
      const balance = await prisma.stockBalance.findUnique({
        where: { itemId_locationId: { itemId: payload.itemId, locationId: payload.fromLocationId } }
      });

      if (!balance || balance.quantityOnHand < payload.quantity) {
        throw new AppError("Insufficient stock", 400);
      }

      const updated = await prisma.stockBalance.update({
        where: { itemId_locationId: { itemId: payload.itemId, locationId: payload.fromLocationId } },
        data: { quantityOnHand: { decrement: payload.quantity } }
      });

      const tx = await postStockTransaction({
        transactionNumber: docNumber("TX"),
        type: TransactionType.ISSUE,
        itemId: payload.itemId,
        fromLocationId: payload.fromLocationId,
        toLocationId: null,
        quantity: payload.quantity,
        unitCost: null,
        totalCost: null,
        reasonCode: `${payload.reasonCode}:${payload.issueToType}:${payload.issueToReference}`,
        linkedDocumentId: payload.acknowledgement,
        performedById: req.user!.id,
        approvedById: null,
        fsApprovalRef: null
      });

      await logAudit(req, "ISSUE", "StockTransaction", tx.id, balance, updated, payload.reasonCode, payload.acknowledgement);
      res.status(201).json({ updated, tx });
    } catch (error) {
      next(error);
    }
  }
);

const transferSchema = z.object({
  itemId: z.string().cuid(),
  fromLocationId: z.string().cuid(),
  toLocationId: z.string().cuid(),
  quantity: z.number().int().positive(),
  destinationIsExternalMda: z.boolean().default(false),
  fsApprovalReference: z.string().optional(),
  transferDocumentReference: z.string().min(2)
});

transactionRouter.post(
  "/transfer",
  requireRoles([
    UserRole.STOREKEEPER,
    UserRole.ASSET_MANAGER,
    UserRole.APPROVING_OFFICER
  ]),
  async (req, res, next) => {
    try {
      const payload = transferSchema.parse(req.body);
      await ensureInterMdaTransferApproval(payload.destinationIsExternalMda, payload.fsApprovalReference);

      const source = await prisma.stockBalance.findUnique({
        where: {
          itemId_locationId: {
            itemId: payload.itemId,
            locationId: payload.fromLocationId
          }
        }
      });
      if (!source || source.quantityOnHand < payload.quantity) {
        throw new AppError("Insufficient source stock for transfer", 400);
      }

      await prisma.$transaction([
        prisma.stockBalance.update({
          where: { itemId_locationId: { itemId: payload.itemId, locationId: payload.fromLocationId } },
          data: { quantityOnHand: { decrement: payload.quantity } }
        }),
        prisma.stockBalance.upsert({
          where: { itemId_locationId: { itemId: payload.itemId, locationId: payload.toLocationId } },
          update: { quantityOnHand: { increment: payload.quantity } },
          create: { itemId: payload.itemId, locationId: payload.toLocationId, quantityOnHand: payload.quantity }
        })
      ]);

      const tx = await postStockTransaction({
        transactionNumber: docNumber("TX"),
        type: TransactionType.TRANSFER_OUT,
        itemId: payload.itemId,
        fromLocationId: payload.fromLocationId,
        toLocationId: payload.toLocationId,
        quantity: payload.quantity,
        unitCost: null,
        totalCost: null,
        reasonCode: payload.destinationIsExternalMda ? "INTER_MDA_TRANSFER" : "INTERNAL_TRANSFER",
        linkedDocumentId: payload.transferDocumentReference,
        performedById: req.user!.id,
        approvedById: req.user!.id,
        fsApprovalRef: payload.fsApprovalReference || null
      });

      await logAudit(
        req,
        "TRANSFER",
        "StockTransaction",
        tx.id,
        source,
        { quantityMoved: payload.quantity },
        tx.reasonCode || undefined,
        payload.transferDocumentReference,
        payload.fsApprovalReference
      );

      res.status(201).json({ tx });
    } catch (error) {
      next(error);
    }
  }
);

const adjustmentSchema = z.object({
  itemId: z.string().cuid(),
  locationId: z.string().cuid(),
  quantity: z.number().int(),
  reasonCode: z.enum([
    "DAMAGE",
    "EXPIRY",
    "COUNT_VARIANCE",
    "BREAKAGE",
    "THEFT",
    "ADMIN_CORRECTION"
  ]),
  approvalReference: z.string().min(2)
});

transactionRouter.post(
  "/adjustment",
  requireRoles([
    UserRole.STOREKEEPER,
    UserRole.ASSET_MANAGER,
    UserRole.APPROVING_OFFICER,
    UserRole.ACCOUNTING_OFFICER
  ]),
  async (req, res, next) => {
    try {
      const payload = adjustmentSchema.parse(req.body);
      await ensureAdjustmentAuthority(req.user!.role, payload.quantity);

      const before = await prisma.stockBalance.findUnique({
        where: {
          itemId_locationId: {
            itemId: payload.itemId,
            locationId: payload.locationId
          }
        }
      });
      if (!before) {
        throw new AppError("Stock balance not found", 404);
      }

      if (payload.quantity < 0 && before.quantityOnHand < Math.abs(payload.quantity)) {
        throw new AppError("Cannot reduce below zero", 400);
      }

      const after = await prisma.stockBalance.update({
        where: {
          itemId_locationId: {
            itemId: payload.itemId,
            locationId: payload.locationId
          }
        },
        data: {
          quantityOnHand: {
            increment: payload.quantity
          }
        }
      });

      const txType = payload.quantity >= 0 ? TransactionType.ADJUSTMENT_GAIN : TransactionType.ADJUSTMENT_LOSS;
      const tx = await postStockTransaction({
        transactionNumber: docNumber("TX"),
        type: txType,
        itemId: payload.itemId,
        fromLocationId: payload.locationId,
        toLocationId: payload.locationId,
        quantity: Math.abs(payload.quantity),
        unitCost: null,
        totalCost: null,
        reasonCode: payload.reasonCode,
        linkedDocumentId: payload.approvalReference,
        performedById: req.user!.id,
        approvedById: req.user!.id,
        fsApprovalRef: null
      });

      await logAudit(req, "ADJUST", "StockBalance", before.id, before, after, payload.reasonCode, payload.approvalReference);
      res.status(201).json({ after, tx });
    } catch (error) {
      next(error);
    }
  }
);

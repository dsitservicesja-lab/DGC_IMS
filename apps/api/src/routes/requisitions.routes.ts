import { Router } from "express";
import { ApprovalStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { logAudit } from "../middleware/audit.js";
import { docNumber } from "../utils/id.js";
import {
  ensureBeforePurchaseStockCheck,
  ensureSod,
  updateRequisitionStatus
} from "../services/compliance.service.js";

const reqSchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.number().int().positive(),
  costCentre: z.string().min(1),
  intendedUse: z.string().min(4),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "EMERGENCY"]),
  justification: z.string().min(4),
  destinationLocationId: z.string().cuid(),
  emergencyFlag: z.boolean().default(false),
  emergencyReasonCode: z.string().optional()
});

export const requisitionRouter = Router();
requisitionRouter.use(requireAuth);

requisitionRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.requisition.findMany({
      include: {
        item: true,
        requester: true,
        approver: true,
        destinationLocation: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

requisitionRouter.post("/", async (req, res, next) => {
  try {
    const payload = reqSchema.parse(req.body);
    const stock = await ensureBeforePurchaseStockCheck(payload.itemId);

    const duplicate = await prisma.requisition.findFirst({
      where: {
        requesterId: req.user!.id,
        itemId: payload.itemId,
        quantity: payload.quantity,
        status: { in: [ApprovalStatus.DRAFT, ApprovalStatus.SUBMITTED] }
      }
    });

    const requisition = await prisma.requisition.create({
      data: {
        ...payload,
        reqNumber: docNumber("REQ"),
        requesterId: req.user!.id,
        status: ApprovalStatus.SUBMITTED,
        duplicateFlag: Boolean(duplicate),
        excessiveFlag: payload.quantity > Math.max(stock.currentStock * 1.5, 10)
      }
    });

    await logAudit(req, "CREATE", "Requisition", requisition.id, undefined, requisition);
    res.status(201).json({ requisition, stockCheck: stock });
  } catch (error) {
    next(error);
  }
});

requisitionRouter.post(
  "/:id/approve",
  requireRoles([
    UserRole.APPROVING_OFFICER,
    UserRole.ACCOUNTING_OFFICER,
    UserRole.FINANCE_OFFICER
  ]),
  async (req, res, next) => {
    try {
      const requisitionId = String(req.params.id);
      await ensureSod(req.user!.id, "APPROVE_REQUISITION", requisitionId);
      const updated = await updateRequisitionStatus(requisitionId, ApprovalStatus.APPROVED, req.user!.id);
      await logAudit(req, "APPROVE", "Requisition", updated.id, undefined, updated);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

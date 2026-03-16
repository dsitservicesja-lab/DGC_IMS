import { Prisma, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { logAudit } from "../middleware/audit.js";
import { docNumber } from "../utils/id.js";
import { AppError } from "../utils/errors.js";

export const disposalRouter = Router();
disposalRouter.use(requireAuth);

const disposalSchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.number().int().positive(),
  locationId: z.string().cuid(),
  method: z.enum(["DESTRUCTION", "AUCTION", "TRANSFER", "DONATION", "RETURN_SUPPLIER", "SCRAP"]),
  surveyRecordReference: z.string().min(2),
  recommendation: z.string().min(4),
  authorityApprovalRef: z.string().min(2),
  proceeds: z.number().nonnegative().optional(),
  evidenceAttachment: z.string().optional()
});

disposalRouter.post(
  "/",
  requireRoles([
    UserRole.DISPOSAL_AUTHORITY,
    UserRole.ACCOUNTING_OFFICER,
    UserRole.APPROVING_OFFICER
  ]),
  async (req, res, next) => {
    try {
      const payload = disposalSchema.parse(req.body);
      const before = await prisma.stockBalance.findUnique({
        where: { itemId_locationId: { itemId: payload.itemId, locationId: payload.locationId } }
      });

      if (!before || before.quantityOnHand < payload.quantity) {
        throw new AppError("Insufficient stock for disposal", 400);
      }

      const after = await prisma.stockBalance.update({
        where: { itemId_locationId: { itemId: payload.itemId, locationId: payload.locationId } },
        data: {
          quantityOnHand: { decrement: payload.quantity },
          quantityDisposed: { increment: payload.quantity }
        }
      });

      const disposal = await prisma.disposalRecord.create({
        data: {
          disposalNumber: docNumber("DSP"),
          itemId: payload.itemId,
          quantity: payload.quantity,
          method: payload.method,
          surveyRecordReference: payload.surveyRecordReference,
          recommendation: payload.recommendation,
          authorityApprovalRef: payload.authorityApprovalRef,
          proceeds: payload.proceeds ? new Prisma.Decimal(payload.proceeds) : undefined,
          evidenceAttachment: payload.evidenceAttachment,
          status: "CLOSED"
        }
      });

      await logAudit(
        req,
        "DISPOSE",
        "DisposalRecord",
        disposal.id,
        before,
        { disposal, after },
        payload.method,
        payload.surveyRecordReference,
        payload.authorityApprovalRef
      );

      res.status(201).json({ disposal, after });
    } catch (error) {
      next(error);
    }
  }
);

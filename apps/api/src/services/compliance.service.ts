import { ApprovalStatus, StockTransaction, TransactionType, UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/errors.js";

export async function ensureSod(userId: string, action: string, entityId?: string) {
  if (!entityId) {
    return;
  }

  if (action === "APPROVE_REQUISITION") {
    const req = await prisma.requisition.findUnique({ where: { id: entityId } });
    if (!req) {
      throw new AppError("Requisition not found", 404);
    }
    if (req.requesterId === userId) {
      throw new AppError("Requester cannot approve own requisition", 403);
    }
  }
}

export async function ensureProcurementReference(poNumber?: string, donorSource?: string) {
  if (!poNumber && !donorSource) {
    throw new AppError("Receiving requires PO or donation source reference", 400);
  }
}

export async function ensureInterMdaTransferApproval(
  destinationIsExternalMda: boolean,
  fsApprovalReference?: string
) {
  if (destinationIsExternalMda && !fsApprovalReference) {
    throw new AppError(
      "Inter-MDA transfer requires Financial Secretary approval reference",
      400
    );
  }
}

export async function ensureAdjustmentAuthority(role: UserRole, quantity: number) {
  const highImpact = Math.abs(quantity) >= 50;
  if (highImpact && role !== UserRole.APPROVING_OFFICER && role !== UserRole.ACCOUNTING_OFFICER) {
    throw new AppError("High impact adjustments require senior approval", 403);
  }
}

export async function ensureBeforePurchaseStockCheck(itemId: string) {
  const balances = await prisma.stockBalance.findMany({ where: { itemId } });
  const currentStock = balances.reduce((acc, it) => acc + it.quantityOnHand, 0);
  return { currentStock };
}

export async function computeStockMetrics(itemId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new AppError("Item not found", 404);
  }
  const balances = await prisma.stockBalance.findMany({ where: { itemId } });
  const onHand = balances.reduce((acc, b) => acc + b.quantityOnHand, 0);
  return {
    belowMin: onHand < item.minLevel,
    aboveMax: item.maxLevel > 0 ? onHand > item.maxLevel : false,
    reorderNeeded: onHand <= item.reorderLevel,
    onHand
  };
}

export async function postStockTransaction(data: Omit<StockTransaction, "id" | "createdAt">) {
  return prisma.stockTransaction.create({ data });
}

export async function updateRequisitionStatus(id: string, status: ApprovalStatus, approverId?: string) {
  return prisma.requisition.update({
    where: { id },
    data: {
      status,
      approverId
    }
  });
}

export async function enforceDelegationValidity(userId: string) {
  const now = new Date();
  const delegation = await prisma.delegation.findFirst({
    where: {
      toUserId: userId,
      startsAt: { lte: now },
      endsAt: { gte: now },
      status: "ACTIVE"
    }
  });
  return Boolean(delegation);
}

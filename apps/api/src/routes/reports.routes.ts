import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const reportRouter = Router();
reportRouter.use(requireAuth);

reportRouter.get("/kpis", async (_req, res, next) => {
  try {
    const [items, balances, requisitions, transactions] = await Promise.all([
      prisma.inventoryItem.findMany(),
      prisma.stockBalance.findMany(),
      prisma.requisition.findMany(),
      prisma.stockTransaction.findMany()
    ]);

    const totalOnHand = balances.reduce((acc, b) => acc + b.quantityOnHand, 0);
    const belowMinimum = items.filter((item) => {
      const sum = balances
        .filter((b) => b.itemId === item.id)
        .reduce((acc, b) => acc + b.quantityOnHand, 0);
      return sum < item.minLevel;
    }).length;

    const submittedReq = requisitions.filter((r) => r.status === "SUBMITTED").length;
    const approvedReq = requisitions.filter((r) => r.status === "APPROVED").length;

    const last30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const losses = transactions.filter(
      (t) => (t.type === "ADJUSTMENT_LOSS" || t.type === "DISPOSAL") && t.createdAt >= last30days
    );

    const shrinkageQty = losses.reduce((acc, t) => acc + t.quantity, 0);

    res.json({
      stockAccuracyPercent: totalOnHand > 0 ? Number(((totalOnHand - shrinkageQty) / totalOnHand * 100).toFixed(2)) : 100,
      orderFillRate: approvedReq + submittedReq > 0 ? Number((approvedReq / (approvedReq + submittedReq) * 100).toFixed(2)) : 100,
      stockOutItems: belowMinimum,
      requisitionsSubmitted: submittedReq,
      requisitionsApproved: approvedReq,
      shrinkageQuantity30Days: shrinkageQty
    });
  } catch (error) {
    next(error);
  }
});

reportRouter.get("/stock-ledger", async (_req, res, next) => {
  try {
    const tx = await prisma.stockTransaction.findMany({
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 500
    });
    res.json(tx);
  } catch (error) {
    next(error);
  }
});

reportRouter.get("/audit-exceptions", async (_req, res, next) => {
  try {
    const suspicious = await prisma.auditLog.findMany({
      where: {
        OR: [
          { reasonCode: "THEFT" },
          { action: "ADJUST" },
          { action: "DISPOSE" }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 250
    });

    res.json(suspicious);
  } catch (error) {
    next(error);
  }
});

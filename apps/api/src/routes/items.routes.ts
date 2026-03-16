import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { logAudit } from "../middleware/audit.js";
import { docNumber } from "../utils/id.js";

const itemSchema = z.object({
  standardName: z.string().min(2),
  description: z.string().min(2),
  category: z.enum([
    "CONSUMABLES",
    "OFFICE_SUPPLIES",
    "CLEANING_SUPPLIES",
    "LABORATORY_SUPPLIES",
    "CHEMICALS_REAGENTS",
    "PPE_SAFETY",
    "SPARE_PARTS",
    "MAINTENANCE_STOCK",
    "UNIFORMS",
    "IT_CONSUMABLES",
    "CONTROLLED_STATIONERY",
    "GOODS_FOR_DISTRIBUTION",
    "GOODS_FOR_RESALE",
    "WORK_IN_PROGRESS"
  ]),
  unitOfMeasure: z.string().min(1),
  reorderLevel: z.number().int().nonnegative().default(0),
  reorderQuantity: z.number().int().nonnegative().default(0),
  minLevel: z.number().int().nonnegative().default(0),
  maxLevel: z.number().int().nonnegative().default(0),
  safetyStock: z.number().int().nonnegative().default(0),
  standardCost: z.number().nonnegative(),
  averageCost: z.number().nonnegative()
});

export const itemRouter = Router();
itemRouter.use(requireAuth);

itemRouter.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { standardName: "asc" },
      include: {
        stockBalances: {
          include: { location: true }
        }
      }
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

itemRouter.post(
  "/",
  requireRoles([
    UserRole.SYSTEM_ADMIN,
    UserRole.ASSET_MANAGER,
    UserRole.STOREKEEPER,
    UserRole.PROCUREMENT_OFFICER
  ]),
  async (req, res, next) => {
    try {
      const payload = itemSchema.parse(req.body);
      const item = await prisma.inventoryItem.create({
        data: {
          ...payload,
          itemCode: docNumber("ITM")
        }
      });

      await logAudit(req, "CREATE", "InventoryItem", item.id, undefined, item);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

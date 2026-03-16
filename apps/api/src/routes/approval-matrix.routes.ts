import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { approvalMatrixService } from "../services/approval-matrix.service.js";
import { PrismaClient, ApprovalLevel } from "@prisma/client";

const router = Router();
const client = new PrismaClient();

/**
 * Evaluate approval requirements for a transaction
 * GET /approval-matrix/evaluate?itemId=xxx&quantity=10&value=5000&type=REQUISITION
 */
router.get("/evaluate", requireAuth, async (req, res) => {
  try {
    const { itemId, quantity, value, type } = req.query;

    if (!itemId || !quantity || !value || !type) {
      return res.status(400).json({
        error: "Missing required query parameters: itemId, quantity, value, type"
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const requirement = await approvalMatrixService.evaluateApprovalRequirements(
      type as any,
      String(itemId),
      parseInt(String(quantity), 10),
      parseFloat(String(value)),
      userId
    );

    res.json(requirement);
  } catch (err) {
    console.error("Approval evaluation error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to evaluate approval requirements"
    });
  }
});

/**
 * Get all active approval matrix rules
 * GET /approval-matrix/rules
 */
router.get("/rules", requireAuth, async (req, res) => {
  try {
    const rules = await client.approvalMatrixRule.findMany({
      where: { active: true },
      orderBy: [{ valueThreshold: { sort: "desc", nulls: "last" } }]
    });

    res.json(rules);
  } catch (err) {
    console.error("Rules retrieval error:", err);
    res.status(500).json({
      error: "Failed to retrieve approval matrix rules"
    });
  }
});

/**
 * Initialize default approval matrix rules (admin only)
 * POST /approval-matrix/initialize
 */
router.post("/initialize", requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "SYSTEM_ADMIN") {
      return res.status(403).json({ error: "Only admins can initialize rules" });
    }

    await approvalMatrixService.initializeDefaultRules();
    res.json({ message: "Default approval matrix rules initialized successfully" });
  } catch (err) {
    console.error("Rule initialization error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to initialize rules"
    });
  }
});

export default router;

import { NextFunction, Response } from "express";
import { prisma } from "../prisma.js";
import { AuthRequest } from "../types.js";

export async function logAudit(
  req: AuthRequest,
  action: string,
  entityType: string,
  entityId: string,
  beforeValue?: unknown,
  afterValue?: unknown,
  reasonCode?: string,
  linkedDocument?: string,
  approvalReference?: string
) {
  if (!req.user) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      beforeValue: beforeValue ? JSON.stringify(beforeValue) : undefined,
      afterValue: afterValue ? JSON.stringify(afterValue) : undefined,
      reasonCode,
      linkedDocument,
      approvalReference,
      userId: req.user.id,
      role: req.user.role,
      ipAddress: req.ip,
      sessionId: String(req.headers["x-session-id"] || "")
    }
  });
}

export function requireMfaForPrivileged(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next();
  }

  const privilegedRoles = ["SYSTEM_ADMIN", "ACCOUNTING_OFFICER", "FINANCE_OFFICER"];
  if (privilegedRoles.includes(req.user.role) && !req.user.mfaEnabled) {
    return next(new Error("MFA is required for privileged access"));
  }
  return next();
}

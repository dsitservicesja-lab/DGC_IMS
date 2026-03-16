import { Request } from "express";
import { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  role: UserRole;
  name: string;
  approvalLevel: number;
  mfaEnabled: boolean;
};

export type AuthRequest = Request & {
  user?: AuthUser;
};

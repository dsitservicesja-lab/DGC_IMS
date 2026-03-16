import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        name: string;
        approvalLevel: number;
        mfaEnabled: boolean;
      };
    }
  }
}

export {};

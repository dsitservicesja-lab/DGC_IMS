import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { config } from "../config.js";
import { AuthRequest, AuthUser } from "../types.js";
import { AppError } from "../utils/errors.js";

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new AppError("Missing authorization header", 401));
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}

export function requireRoles(roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }
    next();
  };
}

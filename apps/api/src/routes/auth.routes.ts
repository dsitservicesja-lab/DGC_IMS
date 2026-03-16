import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/errors.js";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const payload = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user || !user.isActive) {
      throw new AppError("Invalid credentials", 401);
    }

    const ok = await bcrypt.compare(payload.password, user.passwordHash);
    if (!ok) {
      throw new AppError("Invalid credentials", 401);
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        approvalLevel: user.approvalLevel,
        mfaEnabled: user.mfaEnabled
      },
      config.jwtSecret,
      { expiresIn: "8h" }
    );

    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    next(error);
  }
});

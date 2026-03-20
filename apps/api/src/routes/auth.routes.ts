import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../prisma.js";
import { AppError } from "../utils/errors.js";
import { sendPasswordResetEmail } from "../services/email.service.js";

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

/* ── POST /auth/forgot-password ── request a reset link ── */
const forgotSchema = z.object({ email: z.string().email() });

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      res.json({ message: "If that email exists, a reset link has been sent." });
      return;
    }

    // Invalidate any existing unused tokens for this user
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    await sendPasswordResetEmail(user.email, user.name, token);

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
});

/* ── POST /auth/reset-password ── set a new password with token ── */
const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = resetSchema.parse(req.body);

    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new AppError("Invalid or expired reset link", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: "Password has been reset. You can now sign in." });
  } catch (error) {
    next(error);
  }
});

import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { AppError } from "../utils/errors.js";

const createUserSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  department: z.string().min(1),
  approvalLevel: z.number().int().min(1).max(5).default(1)
});

const updateUserSchema = z.object({
  employeeId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(UserRole).optional(),
  department: z.string().min(1).optional(),
  approvalLevel: z.number().int().min(1).max(5).optional(),
  isActive: z.boolean().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

export const userRouter = Router();

// All user routes require authentication
userRouter.use(requireAuth);

// GET /api/users - List all users (admin only)
userRouter.get("/", requireRoles([UserRole.SYSTEM_ADMIN]), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        approvalLevel: true,
        isActive: true,
        mfaEnabled: true,
        activeFrom: true,
        activeTo: true,
        createdAt: true
      },
      orderBy: { name: "asc" }
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// POST /api/users - Create a new user (admin only)
userRouter.post("/", requireRoles([UserRole.SYSTEM_ADMIN]), async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { employeeId: data.employeeId }] }
    });
    if (existing) {
      throw new AppError("User with this email or employee ID already exists", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        employeeId: data.employeeId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        department: data.department,
        approvalLevel: data.approvalLevel,
        activeFrom: new Date()
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        approvalLevel: true,
        isActive: true,
        createdAt: true
      }
    });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id - Update user (admin only)
userRouter.put("/:id", requireRoles([UserRole.SYSTEM_ADMIN]), async (req, res, next) => {
  try {
    const { password, ...rest } = updateUserSchema.parse(req.body);

    // Check uniqueness of employeeId/email if they are being changed
    if (rest.employeeId || rest.email) {
      const conditions = [];
      if (rest.employeeId) conditions.push({ employeeId: rest.employeeId });
      if (rest.email) conditions.push({ email: rest.email });
      const existing = await prisma.user.findFirst({
        where: { OR: conditions, NOT: { id: req.params.id as string } }
      });
      if (existing) {
        throw new AppError("User with this email or employee ID already exists", 409);
      }
    }

    const updateData: Record<string, unknown> = { ...rest };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: updateData,
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        approvalLevel: true,
        isActive: true,
        createdAt: true
      }
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/reset-password - Admin reset password
userRouter.post("/:id/reset-password", requireRoles([UserRole.SYSTEM_ADMIN]), async (req, res, next) => {
  try {
    const { newPassword } = z.object({ newPassword: z.string().min(8) }).parse(req.body);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.params.id as string },
      data: { passwordHash }
    });
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/change-password - User changes own password
userRouter.post("/me/change-password", async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError("User not found", 404);

    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) throw new AppError("Current password is incorrect", 401);

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/me - Get current user profile
userRouter.get("/me", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        approvalLevel: true,
        isActive: true,
        mfaEnabled: true
      }
    });
    if (!user) throw new AppError("User not found", 404);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

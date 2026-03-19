import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { userRouter } from "./users.routes.js";
import { itemRouter } from "./items.routes.js";
import { requisitionRouter } from "./requisitions.routes.js";
import { transactionRouter } from "./transactions.routes.js";
import { reportRouter } from "./reports.routes.js";
import { disposalRouter } from "./disposal.routes.js";
import approvalMatrixRouter from "./approval-matrix.routes.js";

export const appRouter = Router();

appRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "DGC IMS API" });
});

appRouter.use("/auth", authRouter);
appRouter.use("/users", userRouter);
appRouter.use("/items", itemRouter);
appRouter.use("/requisitions", requisitionRouter);
appRouter.use("/transactions", transactionRouter);
appRouter.use("/disposals", disposalRouter);
appRouter.use("/reports", reportRouter);
appRouter.use("/approval-matrix", approvalMatrixRouter);

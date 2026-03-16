import dotenv from "dotenv";

dotenv.config({ path: process.env.NODE_ENV === "production" ? ".env" : ".env" });

export const config = {
  port: Number(process.env.API_PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change_me",
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
  requireMfaForPrivileged: process.env.REQUIRE_MFA_FOR_PRIVILEGED === "true",
  defaultRetentionYears: Number(process.env.DEFAULT_RETENTION_YEARS || 7)
};

import dotenv from "dotenv";

dotenv.config({ path: process.env.NODE_ENV === "production" ? ".env" : ".env" });

export const config = {
  port: Number(process.env.API_PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change_me",
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
  requireMfaForPrivileged: process.env.REQUIRE_MFA_FOR_PRIVILEGED === "true",
  defaultRetentionYears: Number(process.env.DEFAULT_RETENTION_YEARS || 7),
  appUrl: process.env.APP_URL || "http://localhost:5173",
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@dgc.gov.jm",
  },
};

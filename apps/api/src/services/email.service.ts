import nodemailer from "nodemailer";
import { config } from "../config.js";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  resetToken: string
) {
  const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"DGC IMS" <${config.smtp.from}>`,
    to,
    subject: "Password Reset – DGC Inventory Management System",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(130deg, #0b3d3a, #165f56); color: #eaf4f1; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="margin: 0;">DGC Inventory Management System</h2>
          <p style="margin: 4px 0 0; opacity: 0.85;">Department of Government Chemist</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #d6e2ea; border-top: none; padding: 28px 24px; border-radius: 0 0 12px 12px;">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>A password reset was requested for your account. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #d28b20; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Reset Password
            </a>
          </div>
          <p style="color: #486174; font-size: 0.9rem;">This link expires in <strong>1 hour</strong>. If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #d6e2ea; margin: 24px 0;" />
          <p style="color: #999; font-size: 0.8rem; text-align: center;">DGC IMS &bull; Governance-first stores control</p>
        </div>
      </div>
    `,
  });
}

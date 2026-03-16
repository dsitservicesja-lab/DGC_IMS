/**
 * Multi-Factor Authentication (MFA) Service
 * Supports TOTP (Time-based One-Time Password) via authenticator apps
 * and SMS-based OTP
 */

import * as crypto from "crypto";

export interface MFASecret {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerification {
  isValid: boolean;
  remaining: number; // remaining attempts before lockout
}

export class MFAService {
  private static readonly SECRET_LENGTH = 32;
  private static readonly TOKEN_LENGTH = 6;
  private static readonly TIME_WINDOW = 30; // seconds
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Generate TOTP secret and QR code URL
   * Used for authenticator apps (Google Authenticator, Microsoft Authenticator, Authy)
   */
  static generateTOTPSecret(email: string, issuer: string = "DGC_IMS"): MFASecret {
    const secret = crypto.randomBytes(this.SECRET_LENGTH).toString("base64");
    const cleanSecret = secret.replace(/[^A-Z2-7]/g, "");

    // Generate QR code URL (using otpauth:// scheme)
    // In production, use a library like 'qrcode' to generate actual QR image
    const qrCodeUrl = `otpauth://totp/${email}?secret=${cleanSecret}&issuer=${issuer}`;

    // Generate backup codes (10 codes, 8 characters each)
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    return {
      secret: cleanSecret,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Verify TOTP token from authenticator app
   */
  static verifyTOTP(secret: string, token: string): boolean {
    // Implement TOTP verification using SHA1 HMAC
    // Libraries like 'speakeasy' or 'totp-generator' can handle this

    // This is a simplified example - for production use a proper library
    if (!secret || !token || token.length !== this.TOKEN_LENGTH) {
      return false;
    }

    // In real implementation, verify against current and adjacent time windows
    try {
      const hmac = crypto.createHmac("sha1", Buffer.from(secret, "base64"));
      const counter = Math.floor(Date.now() / 1000 / this.TIME_WINDOW);

      for (let i = -1; i <= 1; i++) {
        const counterBuffer = Buffer.alloc(8);
        counterBuffer.writeBigInt64BE(BigInt(counter + i), 0);

        hmac.update(counterBuffer);
        const digest = hmac.digest();
        const offset = digest[digest.length - 1] & 0xf;
        const code = ((digest[offset] & 0x7f) << 24) |
          ((digest[offset + 1] & 0xff) << 16) |
          ((digest[offset + 2] & 0xff) << 8) |
          (digest[offset + 3] & 0xff);

        const otpToken = (code % Math.pow(10, this.TOKEN_LENGTH)).toString().padStart(this.TOKEN_LENGTH, "0");
        if (otpToken === token) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Verify backup code (single-use)
   */
  static verifyBackupCode(code: string, storedCodes: string[]): boolean {
    return storedCodes.includes(code.toUpperCase());
  }

  /**
   * Remove used backup code
   */
  static removeBackupCode(code: string, storedCodes: string[]): string[] {
    return storedCodes.filter((c) => c !== code.toUpperCase());
  }

  /**
   * Generate SMS OTP (6 digits)
   */
  static generateSMSOTP(): string {
    return Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
  }

  /**
   * Verify SMS OTP (should be done within 5 minutes)
   */
  static verifySMSOTP(
    submittedCode: string,
    storedCode: string,
    issuedAt: Date
  ): boolean {
    const OTP_VALIDITY = 5 * 60 * 1000; // 5 minutes

    if (Date.now() - issuedAt.getTime() > OTP_VALIDITY) {
      return false;
    }

    return submittedCode === storedCode;
  }
}

/**
 * Database schema addition for MFA:
 * Add to User model:
 *   - mfaMethod: String (TOTP, SMS, NONE)
 *   - mfaSecret: String (encrypted)
 *   - backupCodes: String[] (encrypted, single-use)
 *   - smsPhone: String (encrypted)
 *   - mfaVerifiedAt: DateTime
 *   - failedMFAAttempts: Int
 *   - mfaLockedUntil: DateTime
 */

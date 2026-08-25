import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import type { User } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { IdentityService } from "../identity/identity.service";
import { EmailService } from "../../common/email/email.service";
import { AUTH_AUDIT_ACTIONS } from "./audit-actions";
import type { AuthTokensDto, LoginResponseDto } from "./dto/auth-tokens.dto";
import { UserResponseDto } from "../identity/dto/user-response.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly identityService: IdentityService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  // ── Login ────────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
    correlationId?: string,
  ): Promise<LoginResponseDto> {
    const auditMeta = { ipAddress, userAgent };

    // Find user (do NOT reveal whether email exists)
    const user = await this.identityService.findByEmailInternal(email);
    if (!user) {
      // Constant-time delay to prevent timing attacks
      await bcrypt.compare(password, "$2a$12$invaliddummyhashfortimingatk");
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        action: AUTH_AUDIT_ACTIONS.LOGIN_LOCKED,
        resource: "user",
        resourceId: user.id,
        result: "FAILURE",
        correlationId,
        ...auditMeta,
      });
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60_000,
      );
      throw new ForbiddenException(
        `Account is temporarily locked. Try again in ${minutesRemaining} minute(s).`,
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const maxAttempts = this.configService.get<number>(
        "security.lockoutAttempts",
        5,
      );
      const lockoutMinutes = this.configService.get<number>(
        "security.lockoutDurationMinutes",
        15,
      );

      // Single atomic SQL UPDATE: increment counter AND conditionally set
      // lockedUntil in the same statement.  There is no intermediate state
      // where failedLoginAttempts ≥ threshold but lockedUntil is still NULL,
      // so a concurrent valid login's conditional reset cannot bypass this lock.
      const { failedLoginAttempts: attempts, lockedUntil } =
        await this.identityService.incrementAndMaybeLock(
          user.id,
          maxAttempts,
          lockoutMinutes,
        );

      if (lockedUntil) {
        this.logger.warn(
          { userId: user.id, email: user.email, attempts },
          "Account locked after failed login attempts",
        );
      }

      await this.auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        action: AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        resource: "user",
        resourceId: user.id,
        result: "FAILURE",
        correlationId,
        metadata: { failedAttempts: attempts },
        ...auditMeta,
      });

      throw new UnauthorizedException("Invalid credentials");
    }

    // Check account status
    if (user.status !== "ACTIVE" && user.status !== "PENDING") {
      throw new ForbiddenException(
        `Account is ${user.status.toLowerCase()}. Contact support.`,
      );
    }

    // Atomic reset: a single conditional UPDATE checks lock state and clears
    // the counter in one SQL statement.  If a concurrent wrong-password request
    // reached the threshold and set lockedUntil during our bcrypt.compare, the
    // WHERE clause won't match and wasLocked comes back true — we must refuse
    // to issue tokens so the earned lockout is not silently bypassed.
    const { wasLocked } = await this.identityService.resetFailedAttempts(
      user.id,
    );
    if (wasLocked) {
      const lockedState = await this.identityService.findByIdInternal(user.id);
      const minutesRemaining = lockedState?.lockedUntil
        ? Math.ceil((lockedState.lockedUntil.getTime() - Date.now()) / 60_000)
        : 15;
      await this.auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        action: AUTH_AUDIT_ACTIONS.LOGIN_LOCKED,
        resource: "user",
        resourceId: user.id,
        result: "FAILURE",
        correlationId,
        ...auditMeta,
      });
      throw new ForbiddenException(
        `Account is temporarily locked. Try again in ${minutesRemaining} minute(s).`,
      );
    }

    await this.identityService.recordLogin(user.id);

    const tokens = await this.createTokenPair(user);

    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AUTH_AUDIT_ACTIONS.LOGIN_SUCCESS,
      resource: "user",
      resourceId: user.id,
      result: "SUCCESS",
      correlationId,
      ...auditMeta,
    });

    // Return the canonical full profile (contract: LoginResponse.user is UserProfile).
    // Re-read so lastLoginAt reflects the login recorded above.
    const freshUser = await this.identityService.findByEmailInternal(email);
    return {
      user: UserResponseDto.from(freshUser ?? user),
      tokens,
    };
  }

  // ── Logout ───────────────────────────────────────────────────────────────────

  async logout(
    userId: string,
    plainRefreshToken: string,
    correlationId?: string,
  ): Promise<void> {
    const hash = this.hashToken(plainRefreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId, tokenHash: hash, revokedAt: null },
    });

    if (stored) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
    }

    await this.auditService.log({
      actorId: userId,
      action: AUTH_AUDIT_ACTIONS.LOGOUT,
      resource: "refresh_token",
      resourceId: stored?.id,
      result: "SUCCESS",
      correlationId,
    });
  }

  // ── Token Refresh ─────────────────────────────────────────────────────────────

  async refreshTokens(
    plainRefreshToken: string,
    correlationId?: string,
  ): Promise<AuthTokensDto> {
    const hash = this.hashToken(plainRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Theft detection: token was already revoked
    if (stored.revokedAt) {
      this.logger.warn(
        { family: stored.family, userId: stored.userId },
        "Refresh token reuse detected — revoking token family",
      );
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { revokedAt: new Date() },
      });
      await this.auditService.log({
        actorId: stored.userId,
        action: AUTH_AUDIT_ACTIONS.TOKEN_THEFT_DETECTED,
        resource: "refresh_token",
        resourceId: stored.id,
        result: "FAILURE",
        correlationId,
        metadata: { family: stored.family },
      });
      throw new UnauthorizedException(
        "Refresh token has been revoked. Please log in again.",
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        "Refresh token has expired. Please log in again.",
      );
    }

    if (stored.user.status !== "ACTIVE" && stored.user.status !== "PENDING") {
      throw new ForbiddenException(
        `Account is ${stored.user.status.toLowerCase()}. Contact support.`,
      );
    }

    // Rotate: revoke the used token, issue a new pair in the same family
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.createTokenPair(stored.user, stored.family);

    await this.auditService.log({
      actorId: stored.userId,
      action: AUTH_AUDIT_ACTIONS.TOKEN_REFRESHED,
      resource: "refresh_token",
      result: "SUCCESS",
      correlationId,
    });

    return tokens;
  }

  // ── Change Password ───────────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    correlationId?: string,
  ): Promise<void> {
    const user = await this.identityService.findByIdInternal(userId);
    if (!user) throw new UnauthorizedException("User not found");

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      await this.auditService.log({
        actorId: userId,
        actorEmail: user.email,
        action: AUTH_AUDIT_ACTIONS.PASSWORD_CHANGE_FAILED,
        resource: "user",
        resourceId: userId,
        result: "FAILURE",
        correlationId,
      });
      throw new UnauthorizedException("Current password is incorrect");
    }

    // Enforce new password differs from current
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException(
        "New password must be different from current password",
      );
    }

    const rounds = this.configService.get<number>("security.bcryptRounds", 12);
    const newHash = await bcrypt.hash(newPassword, rounds);

    await this.identityService.updatePassword(userId, newHash);

    // Revoke all refresh tokens — force re-login on all devices
    const revokedCount =
      await this.identityService.revokeAllRefreshTokens(userId);

    await this.auditService.log({
      actorId: userId,
      actorEmail: user.email,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_CHANGED,
      resource: "user",
      resourceId: userId,
      result: "SUCCESS",
      correlationId,
      metadata: { sessionsRevoked: revokedCount },
    });

    this.logger.log({ userId }, "Password changed — all sessions revoked");
  }

  // ── Password Reset ────────────────────────────────────────────────────────────

  async requestPasswordReset(
    email: string,
    correlationId?: string,
  ): Promise<void> {
    const user = await this.identityService.findByEmailInternal(email);

    // Always return success to prevent email enumeration
    if (!user) return;

    // Expire any existing reset tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date() }, // expire immediately
    });

    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() +
        this.configService.get<number>(
          "security.passwordResetExpiresMinutes",
          60,
        ),
    );

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Notify user — fire-and-forget; errors are logged but do not expose
    // whether the account exists (enumeration prevention).
    await this.notifyPasswordReset(user.email, plainToken);

    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      resource: "password_reset_token",
      result: "SUCCESS",
      correlationId,
    });
  }

  async confirmPasswordReset(
    plainToken: string,
    newPassword: string,
    correlationId?: string,
  ): Promise<void> {
    const hash = this.hashToken(plainToken);

    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date() || stored.usedAt) {
      await this.auditService.log({
        actorId: "system",
        action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_INVALID_TOKEN,
        resource: "password_reset_token",
        result: "FAILURE",
        correlationId,
      });
      throw new BadRequestException("Reset token is invalid or has expired");
    }

    const rounds = this.configService.get<number>("security.bcryptRounds", 12);
    const newHash = await bcrypt.hash(newPassword, rounds);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash: newHash, passwordChangedAt: new Date() },
      }),
    ]);

    // Revoke all refresh tokens — force re-login everywhere
    await this.identityService.revokeAllRefreshTokens(stored.userId);

    await this.auditService.log({
      actorId: stored.userId,
      actorEmail: stored.user.email,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      resource: "user",
      resourceId: stored.userId,
      result: "SUCCESS",
      correlationId,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private async createTokenPair(
    user: User,
    existingFamily?: string,
  ): Promise<AuthTokensDto> {
    const family = existingFamily ?? uuidv4();

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(plainToken);

    const expiresAt = this.getRefreshTokenExpiry();

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, family, expiresAt },
    });

    return {
      accessToken,
      refreshToken: plainToken,
      expiresIn: this.configService.get<number>("jwt.accessTtlSeconds", 900),
      tokenType: "Bearer",
    };
  }

  /** SHA-256 hash of an opaque token for DB storage.
   *  SHA-256 is appropriate here because the token is 32 bytes of
   *  cryptographically random data (256 bits of entropy), not user input. */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  // ── Email helpers ─────────────────────────────────────────────────────────

  // (see module-level buildPasswordResetEmail below)

  private getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    const raw = this.configService.get<string>("jwt.refreshExpiresIn", "7d");
    const days = parseInt(raw.replace("d", ""), 10);
    expiry.setDate(expiry.getDate() + (isNaN(days) ? 7 : days));
    return expiry;
  }

  /**
   * Notify the user of their password reset token.
   *
   * Sends a real email via Resend when RESEND_API_KEY is configured.
   * In development without a key, logs the token and URL to stdout instead.
   * Errors are caught and logged — the caller already committed the token to
   * the database and must not reveal whether the address exists, so a delivery
   * failure is silent to the HTTP response.
   */
  private async notifyPasswordReset(
    email: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      "email.frontendUrl",
      "http://localhost:5173",
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.emailService.send({
        to: email,
        subject: "Reset your Camel Wallet password",
        html: buildPasswordResetEmail(resetUrl),
        text:
          `You requested a password reset for your Camel Wallet account.\n\n` +
          `Click the link below to set a new password (valid for 60 minutes):\n\n` +
          `${resetUrl}\n\n` +
          `If you did not request this, you can safely ignore this email.`,
      });
    } catch (err) {
      this.logger.error({ err, email }, "Failed to send password reset email");
    }
  }
}

// ── Module-level helpers ──────────────────────────────────────────────────────

/**
 * Minimal HTML email for password resets.
 * Inline styles for maximum email-client compatibility.
 */
function buildPasswordResetEmail(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#1a1a2e;padding:24px 32px">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px">🐪 Camel Wallet</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px">Reset your password</h2>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
            We received a request to reset the password for your Camel Wallet account.
            Click the button below to choose a new password. This link expires in <strong>60 minutes</strong>.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td>
            <a href="${resetUrl}"
               style="display:inline-block;padding:14px 28px;background:#e8a835;color:#1a1a2e;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px">
              Reset Password
            </a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.6">
            If the button doesn't work, copy and paste this URL into your browser:<br>
            <a href="${resetUrl}" style="color:#e8a835;word-break:break-all">${resetUrl}</a>
          </p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
          <p style="margin:0;color:#aaa;font-size:12px">
            If you didn't request a password reset, you can safely ignore this email.
            Your password will not change.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdentityService } from '../identity/identity.service';
import { AUTH_AUDIT_ACTIONS } from './audit-actions';
import type { AuthTokensDto, LoginResponseDto } from './dto/auth-tokens.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly identityService: IdentityService,
    private readonly auditService: AuditService,
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
      await bcrypt.compare(password, '$2a$12$invaliddummyhashfortimingatk');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        action: AUTH_AUDIT_ACTIONS.LOGIN_LOCKED,
        resource: 'user',
        resourceId: user.id,
        result: 'FAILURE',
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
      const attempts = await this.identityService.incrementFailedAttempts(user.id);
      const maxAttempts = this.configService.get<number>('security.lockoutAttempts', 5);

      if (attempts >= maxAttempts) {
        const lockoutMinutes = this.configService.get<number>(
          'security.lockoutDurationMinutes',
          15,
        );
        await this.identityService.lockAccount(user.id, lockoutMinutes);
        this.logger.warn(
          { userId: user.id, email: user.email, attempts },
          'Account locked after failed login attempts',
        );
      }

      await this.auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        action: AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        resource: 'user',
        resourceId: user.id,
        result: 'FAILURE',
        correlationId,
        metadata: { failedAttempts: attempts },
        ...auditMeta,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account status
    if (user.status !== 'ACTIVE' && user.status !== 'PENDING') {
      throw new ForbiddenException(
        `Account is ${user.status.toLowerCase()}. Contact support.`,
      );
    }

    // Successful login
    await this.identityService.resetFailedAttempts(user.id);
    await this.identityService.recordLogin(user.id);

    const tokens = await this.createTokenPair(user);

    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AUTH_AUDIT_ACTIONS.LOGIN_SUCCESS,
      resource: 'user',
      resourceId: user.id,
      result: 'SUCCESS',
      correlationId,
      ...auditMeta,
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
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
      resource: 'refresh_token',
      resourceId: stored?.id,
      result: 'SUCCESS',
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
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Theft detection: token was already revoked
    if (stored.revokedAt) {
      this.logger.warn(
        { family: stored.family, userId: stored.userId },
        'Refresh token reuse detected — revoking token family',
      );
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { revokedAt: new Date() },
      });
      await this.auditService.log({
        actorId: stored.userId,
        action: AUTH_AUDIT_ACTIONS.TOKEN_THEFT_DETECTED,
        resource: 'refresh_token',
        resourceId: stored.id,
        result: 'FAILURE',
        correlationId,
        metadata: { family: stored.family },
      });
      throw new UnauthorizedException(
        'Refresh token has been revoked. Please log in again.',
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    if (stored.user.status !== 'ACTIVE' && stored.user.status !== 'PENDING') {
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
      resource: 'refresh_token',
      result: 'SUCCESS',
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
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      await this.auditService.log({
        actorId: userId,
        actorEmail: user.email,
        action: AUTH_AUDIT_ACTIONS.PASSWORD_CHANGE_FAILED,
        resource: 'user',
        resourceId: userId,
        result: 'FAILURE',
        correlationId,
      });
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Enforce new password differs from current
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException('New password must be different from current password');
    }

    const rounds = this.configService.get<number>('security.bcryptRounds', 12);
    const newHash = await bcrypt.hash(newPassword, rounds);

    await this.identityService.updatePassword(userId, newHash);

    // Revoke all refresh tokens — force re-login on all devices
    const revokedCount = await this.identityService.revokeAllRefreshTokens(userId);

    await this.auditService.log({
      actorId: userId,
      actorEmail: user.email,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_CHANGED,
      resource: 'user',
      resourceId: userId,
      result: 'SUCCESS',
      correlationId,
      metadata: { sessionsRevoked: revokedCount },
    });

    this.logger.log({ userId }, 'Password changed — all sessions revoked');
  }

  // ── Password Reset ────────────────────────────────────────────────────────────

  async requestPasswordReset(email: string, correlationId?: string): Promise<void> {
    const user = await this.identityService.findByEmailInternal(email);

    // Always return success to prevent email enumeration
    if (!user) return;

    // Expire any existing reset tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date() }, // expire immediately
    });

    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() +
        this.configService.get<number>('security.passwordResetExpiresMinutes', 60),
    );

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Notify user — email service required for production
    this.notifyPasswordReset(user.email, plainToken);

    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      resource: 'password_reset_token',
      result: 'SUCCESS',
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
        actorId: 'system',
        action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_INVALID_TOKEN,
        resource: 'password_reset_token',
        result: 'FAILURE',
        correlationId,
      });
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const rounds = this.configService.get<number>('security.bcryptRounds', 12);
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
      resource: 'user',
      resourceId: stored.userId,
      result: 'SUCCESS',
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

    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(plainToken);

    const expiresAt = this.getRefreshTokenExpiry();

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, family, expiresAt },
    });

    return {
      accessToken,
      refreshToken: plainToken,
      expiresIn: this.configService.get<number>('jwt.accessTtlSeconds', 900),
      tokenType: 'Bearer',
    };
  }

  /** SHA-256 hash of an opaque token for DB storage.
   *  SHA-256 is appropriate here because the token is 32 bytes of
   *  cryptographically random data (256 bits of entropy), not user input. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    const raw = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    const days = parseInt(raw.replace('d', ''), 10);
    expiry.setDate(expiry.getDate() + (isNaN(days) ? 7 : days));
    return expiry;
  }

  /**
   * Notify the user of their password reset token.
   *
   * DEVELOPMENT: logs the token and URL to stdout.
   * PRODUCTION: requires an email service integration (planned for a future phase).
   *             Password reset is non-functional in production until email is wired up.
   */
  private notifyPasswordReset(email: string, token: string): void {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(`[DEV] Password reset for: ${email}`, 'PasswordReset');
      this.logger.warn(`[DEV] Token: ${token}`, 'PasswordReset');
      this.logger.warn(`[DEV] URL:   ${resetUrl}`, 'PasswordReset');
    } else {
      // TODO: Email service integration — send reset URL to user's email
      this.logger.error(
        'Email service not configured. Password reset requires email integration. ' +
          'Users cannot complete password resets in production until this is implemented.',
        'PasswordReset',
      );
    }
  }
}

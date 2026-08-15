import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from './audit-actions';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { paginate, type PaginatedResult } from '../../common/dto/pagination.dto';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  // ── Registration ────────────────────────────────────────────────────────────

  async register(
    dto: RegisterUserDto,
    correlationId?: string,
  ): Promise<UserResponseDto> {
    // Check for existing email or phone
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
      select: { email: true, phone: true },
    });

    if (existing) {
      const field = existing.email === dto.email ? 'email address' : 'phone number';
      throw new ConflictException(`This ${field} is already registered`);
    }

    const rounds = this.configService.get<number>('security.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: 'CUSTOMER',
        status: 'PENDING',
        registrationSource: 'SELF_REGISTER',
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.USER_REGISTERED,
      resource: 'user',
      resourceId: user.id,
      result: 'SUCCESS',
      correlationId,
    });

    this.logger.log(
      { userId: user.id, email: user.email },
      'New user registered',
    );

    return UserResponseDto.from(user);
  }

  // ── Lookup ───────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return UserResponseDto.from(user);
  }

  /** Internal use only — returns full User entity including passwordHash */
  async findByIdInternal(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Internal use only — find by email for authentication */
  async findByEmailInternal(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // ── Admin: List users ────────────────────────────────────────────────────────

  async findAll(
    query: ListUsersQueryDto,
    actorId: string,
    correlationId?: string,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const { page, limit, status, role, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(status && { status }),
      ...(role && { role }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    await this.auditService.log({
      actorId,
      action: AUDIT_ACTIONS.ADMIN_USERS_LISTED,
      resource: 'user',
      result: 'SUCCESS',
      correlationId,
      metadata: { page, limit, filters: { status, role, search: !!search } },
    });

    return paginate(users.map(UserResponseDto.from), total, page, limit);
  }

  // ── Admin: Update status ─────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actorId: string,
    correlationId?: string,
  ): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, status: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status,
        // Activating a user clears any lockout so they can log in immediately
        ...(dto.status === 'ACTIVE' && {
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      },
    });

    // Revoke all refresh tokens when suspending or deactivating
    if (dto.status === 'SUSPENDED' || dto.status === 'DEACTIVATED') {
      await this.revokeAllRefreshTokens(id);
    }

    await this.auditService.log({
      actorId,
      action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
      resource: 'user',
      resourceId: id,
      result: 'SUCCESS',
      correlationId,
      metadata: {
        previousStatus: existing.status,
        newStatus: dto.status,
        targetEmail: existing.email,
      },
    });

    this.logger.log(
      { userId: id, from: existing.status, to: dto.status, by: actorId },
      'User status updated',
    );

    return UserResponseDto.from(user);
  }

  // ── Security helpers (used by AuthService) ───────────────────────────────────

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        // Reset lockout on password change
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async incrementFailedAttempts(userId: string): Promise<number> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    return updated.failedLoginAttempts;
  }

  async lockAccount(userId: string, durationMinutes: number): Promise<void> {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + durationMinutes);
    await this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil },
    });
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async recordLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}

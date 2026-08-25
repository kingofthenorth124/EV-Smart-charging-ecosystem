import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

export interface CreateAuditLogInput {
  /** User ID (cuid) or 'system' */
  actorId: string;
  /** Denormalized email for readable audit queries */
  actorEmail?: string;
  /** Audit action constant, e.g. 'USER_LOGIN_SUCCESS' */
  action: string;
  /** Entity type, e.g. 'user', 'refresh_token' */
  resource: string;
  resourceId?: string;
  result: "SUCCESS" | "FAILURE";
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * AuditService — append-only security and operational audit trail.
 *
 * Rules:
 * - Audit records are NEVER updated or deleted
 * - Logging failures must not disrupt the main operation
 * - Sensitive data (passwords, tokens) must never appear in metadata
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          actorEmail: input.actorEmail,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          result: input.result as "SUCCESS" | "FAILURE",
          correlationId: input.correlationId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          // Prisma v7 JSON type cast
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      // Audit failures must not disrupt the calling operation
      this.logger.error(
        { error, action: input.action, actorId: input.actorId },
        "Failed to write audit log — investigate immediately in production",
      );
    }
  }
}

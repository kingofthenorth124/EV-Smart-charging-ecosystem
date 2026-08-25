import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export interface HealthCheckResult {
  status: "ok" | "degraded" | "down";
  checks: {
    database: "ok" | "error";
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    const dbStatus = await this.checkDatabase();

    const status = dbStatus === "ok" ? "ok" : "degraded";

    return {
      status,
      checks: {
        database: dbStatus,
      },
    };
  }

  private async checkDatabase(): Promise<"ok" | "error"> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch (error) {
      this.logger.warn("Database health check failed", error);
      return "error";
    }
  }
}

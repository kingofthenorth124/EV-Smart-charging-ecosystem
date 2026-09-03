import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export interface HeartbeatResult {
  currentTime: string;
}

@Injectable()
export class HeartbeatHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(chargePointId: string): Promise<HeartbeatResult> {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.heartbeatLog.create({
        data: {
          chargePointId,
          receivedAt: now,
          status: "OK",
        },
      }),
      this.prisma.chargePoint.update({
        where: { id: chargePointId },
        data: { lastHeartbeat: now },
      }),
    ]);

    return { currentTime: now.toISOString() };
  }
}

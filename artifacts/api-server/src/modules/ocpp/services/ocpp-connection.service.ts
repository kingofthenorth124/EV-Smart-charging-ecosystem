import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

interface SocketLike {
  send(data: string): void;
  close(): void;
}

@Injectable()
export class OcppConnectionService {
  private readonly sockets = new Map<string, SocketLike>();

  constructor(private readonly prisma: PrismaService) {}

  async register(
    chargePointId: string,
    socket: SocketLike,
    remoteAddress?: string,
  ): Promise<void> {
    this.sockets.set(chargePointId, socket);

    await this.prisma.ocppConnection.create({
      data: {
        chargePointId,
        connected: true,
        connectedAt: new Date(),
        remoteAddress,
        lastMessageAt: new Date(),
      },
    });
  }

  async remove(chargePointId: string): Promise<void> {
    this.sockets.delete(chargePointId);

    const latest = await this.prisma.ocppConnection.findFirst({
      where: { chargePointId, connected: true },
      orderBy: { connectedAt: "desc" },
    });

    if (latest) {
      await this.prisma.ocppConnection.update({
        where: { id: latest.id },
        data: { connected: false, disconnectedAt: new Date() },
      });
    }
  }

  async touch(chargePointId: string): Promise<void> {
    const latest = await this.prisma.ocppConnection.findFirst({
      where: { chargePointId, connected: true },
      orderBy: { connectedAt: "desc" },
    });

    if (latest) {
      await this.prisma.ocppConnection.update({
        where: { id: latest.id },
        data: { lastMessageAt: new Date() },
      });
    }
  }

  get(chargePointId: string): SocketLike | undefined {
    return this.sockets.get(chargePointId);
  }

  isConnected(chargePointId: string): boolean {
    return this.sockets.has(chargePointId);
  }
}

import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma, type ChargingSession, type Station } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { WalletService } from "../wallet/wallet.service";
import { AUDIT_ACTIONS } from "./audit-actions";
import {
  paginate,
  type PaginatedResult,
} from "../../common/dto/pagination.dto";
import type { StartSessionDto } from "./dto/start-session.dto";
import type { PaginationQueryDto } from "../../common/dto/pagination.dto";

export interface StationDto {
  id: string;
  name: string;
  location: string;
  powerKw: number;
  connectorType: string;
  connectorsTotal: number;
  connectorsAvailable: number;
  tariffKoboPerKwh: number;
  status: string;
}

export interface SessionDto {
  id: string;
  status: string;
  stationId: string;
  stationName: string;
  stationLocation: string;
  powerKw: number;
  tariffKoboPerKwh: number;
  energyWh: number;
  costKobo: number;
  limitKobo: number | null;
  elapsedSeconds: number;
  startedAt: Date;
  endedAt: Date | null;
  stopReason: string | null;
}

type SessionWithStation = ChargingSession & { station: Station };

/**
 * Reference charging network seeded once when the stations table is empty.
 * Live availability is maintained by session start/stop; tariffs in kobo/kWh.
 */
const STATION_SEED = [
  {
    name: "Lekki Phase 1 Hub",
    location: "Admiralty Way, Lekki",
    powerKw: 60,
    connectorType: "CCS2",
    connectorsTotal: 4,
    tariffKoboPerKwh: 25000,
  },
  {
    name: "Victoria Island Plaza",
    location: "Adeola Odeku St, VI",
    powerKw: 120,
    connectorType: "CCS2",
    connectorsTotal: 2,
    tariffKoboPerKwh: 32000,
  },
  {
    name: "Ikeja City Mall",
    location: "Obafemi Awolowo Way, Ikeja",
    powerKw: 22,
    connectorType: "Type 2",
    connectorsTotal: 6,
    tariffKoboPerKwh: 18000,
  },
  {
    name: "Yaba Tech Park",
    location: "Herbert Macaulay Way, Yaba",
    powerKw: 50,
    connectorType: "CCS2",
    connectorsTotal: 3,
    tariffKoboPerKwh: 22000,
  },
] as const;

function toStationDto(s: Station): StationDto {
  return {
    id: s.id,
    name: s.name,
    location: s.location,
    powerKw: s.powerKw,
    connectorType: s.connectorType,
    connectorsTotal: s.connectorsTotal,
    connectorsAvailable: s.connectorsAvailable,
    tariffKoboPerKwh: s.tariffKoboPerKwh,
    status: s.status,
  };
}

@Injectable()
export class ChargingService implements OnModuleInit {
  private readonly logger = new Logger(ChargingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly walletService: WalletService,
  ) {}

  /** Seed the reference charging network once (empty table only). */
  async onModuleInit(): Promise<void> {
    const count = await this.prisma.station.count();
    if (count === 0) {
      await this.prisma.station.createMany({
        data: STATION_SEED.map((s) => ({
          ...s,
          connectorsAvailable: s.connectorsTotal,
        })),
      });
      this.logger.log(`Seeded ${STATION_SEED.length} charging stations`);
    }
  }

  async listStations(): Promise<StationDto[]> {
    const stations = await this.prisma.station.findMany({
      orderBy: { name: "asc" },
    });
    return stations.map(toStationDto);
  }

  // ── Live session math ────────────────────────────────────────────────────────
  // No OCPP backend is connected in this environment, so the server computes
  // delivered energy from the elapsed time and the station's power rating.
  // The backend remains the single authority: the frontend never fabricates values.

  private computeLive(
    session: SessionWithStation,
    balanceKobo: number,
    now = new Date(),
  ): {
    energyWh: number;
    costKobo: number;
    capped: "LIMIT_REACHED" | "BALANCE_EXHAUSTED" | null;
    elapsedSeconds: number;
  } {
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now.getTime() - session.startedAt.getTime()) / 1000),
    );
    let energyWh = Math.floor((session.powerKw * 1000 * elapsedSeconds) / 3600);
    let costKobo = Math.floor((energyWh * session.tariffKoboPerKwh) / 1000);
    let capped: "LIMIT_REACHED" | "BALANCE_EXHAUSTED" | null = null;

    const cap = Math.min(session.limitKobo ?? Infinity, balanceKobo);
    if (costKobo >= cap) {
      capped =
        session.limitKobo !== null && cap === session.limitKobo
          ? "LIMIT_REACHED"
          : "BALANCE_EXHAUSTED";
      costKobo = cap;
      energyWh = Math.floor((cap * 1000) / session.tariffKoboPerKwh);
    }
    return { energyWh, costKobo, capped, elapsedSeconds };
  }

  private toSessionDto(
    session: SessionWithStation,
    live?: { energyWh: number; costKobo: number; elapsedSeconds: number },
  ): SessionDto {
    const endReference = session.endedAt ?? new Date();
    return {
      id: session.id,
      status: session.status,
      stationId: session.stationId,
      stationName: session.station.name,
      stationLocation: session.station.location,
      powerKw: session.powerKw,
      tariffKoboPerKwh: session.tariffKoboPerKwh,
      energyWh: live?.energyWh ?? session.energyWh,
      costKobo: live?.costKobo ?? session.costKobo,
      limitKobo: session.limitKobo,
      elapsedSeconds:
        live?.elapsedSeconds ??
        Math.max(
          0,
          Math.floor(
            (endReference.getTime() - session.startedAt.getTime()) / 1000,
          ),
        ),
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      stopReason: session.stopReason,
    };
  }

  // ── Session lifecycle ────────────────────────────────────────────────────────

  async startSession(
    userId: string,
    dto: StartSessionDto,
    correlationId?: string,
  ): Promise<SessionDto> {
    const wallet = await this.walletService.getOrCreateWallet(userId);
    const minBalance = this.walletService.minBalanceKobo;

    if (wallet.status !== "ACTIVE") {
      await this.auditService.log({
        actorId: userId,
        action: AUDIT_ACTIONS.SESSION_START_DENIED,
        resource: "charging_session",
        result: "FAILURE",
        correlationId,
        metadata: { reason: "WALLET_NOT_ACTIVE", walletStatus: wallet.status },
      });
      throw new ForbiddenException("Wallet is suspended — contact support");
    }

    if (wallet.balanceKobo < minBalance) {
      await this.auditService.log({
        actorId: userId,
        action: AUDIT_ACTIONS.SESSION_START_DENIED,
        resource: "charging_session",
        result: "FAILURE",
        correlationId,
        metadata: {
          reason: "INSUFFICIENT_BALANCE",
          balanceKobo: wallet.balanceKobo,
          minBalanceKobo: minBalance,
        },
      });
      throw new HttpException(
        `Wallet balance is below the ₦${(minBalance / 100).toLocaleString()} minimum required to start charging`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const station = await this.prisma.station.findUnique({
      where: { id: dto.stationId },
    });
    if (!station) throw new NotFoundException("Charging station not found");

    // Single transaction with guarded, conditional updates:
    // - the connector is only claimed when one is actually available
    //   (updateMany + WHERE connectorsAvailable > 0, backed by a CHECK constraint)
    // - the DB partial unique index (userId WHERE status='ACTIVE') makes it
    //   impossible to create two ACTIVE sessions for one user, even in a race.
    let session: SessionWithStation;
    try {
      session = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.station.updateMany({
          where: {
            id: station.id,
            status: { not: "OFFLINE" },
            connectorsAvailable: { gt: 0 },
          },
          data: { connectorsAvailable: { decrement: 1 } },
        });
        if (claimed.count === 0) {
          throw new ConflictException(
            "No connectors are available at this station right now",
          );
        }
        const updated = await tx.station.findUniqueOrThrow({
          where: { id: station.id },
        });
        if (updated.connectorsAvailable <= 0 && updated.status !== "BUSY") {
          await tx.station.update({
            where: { id: station.id },
            data: { status: "BUSY" },
          });
        }
        return tx.chargingSession.create({
          data: {
            userId,
            stationId: station.id,
            limitKobo: dto.limitKobo ?? null,
            tariffKoboPerKwh: station.tariffKoboPerKwh,
            powerKw: station.powerKw,
          },
          include: { station: true },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A charging session is already active");
      }
      throw error;
    }

    await this.auditService.log({
      actorId: userId,
      action: AUDIT_ACTIONS.SESSION_STARTED,
      resource: "charging_session",
      resourceId: session.id,
      result: "SUCCESS",
      correlationId,
      metadata: { stationId: station.id, limitKobo: dto.limitKobo ?? null },
    });

    return this.toSessionDto(session, {
      energyWh: 0,
      costKobo: 0,
      elapsedSeconds: 0,
    });
  }

  /** Returns the live active session, auto-finalizing it when a cap is reached. */
  async getActiveSession(
    userId: string,
    correlationId?: string,
  ): Promise<SessionDto | null> {
    const session = await this.prisma.chargingSession.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { station: true },
    });
    if (!session) return null;

    const wallet = await this.walletService.getOrCreateWallet(userId);
    const live = this.computeLive(session, wallet.balanceKobo);

    if (live.capped) {
      return this.finalizeSession(
        session,
        live.energyWh,
        live.costKobo,
        live.capped,
        correlationId,
      );
    }
    return this.toSessionDto(session, live);
  }

  async stopSession(
    userId: string,
    sessionId: string,
    correlationId?: string,
  ): Promise<SessionDto> {
    const session = await this.prisma.chargingSession.findFirst({
      where: { id: sessionId, userId },
      include: { station: true },
    });
    if (!session) throw new NotFoundException("Charging session not found");
    if (session.status !== "ACTIVE") {
      throw new ConflictException("This charging session is no longer active");
    }

    const wallet = await this.walletService.getOrCreateWallet(userId);
    const live = this.computeLive(session, wallet.balanceKobo);
    return this.finalizeSession(
      session,
      live.energyWh,
      live.costKobo,
      live.capped ?? "USER_STOP",
      correlationId,
    );
  }

  /**
   * Finalize a session, release the connector, and settle the wallet — all in
   * ONE transaction. Idempotent under races: the first step atomically claims
   * the ACTIVE -> ended state transition (updateMany guarded on status), so a
   * concurrent finalize observes count 0 and settles nothing twice.
   */
  private async finalizeSession(
    session: SessionWithStation,
    energyWh: number,
    costKobo: number,
    stopReason: string,
    correlationId?: string,
  ): Promise<SessionDto> {
    const endedAt = new Date();
    const status = stopReason === "USER_STOP" ? "STOPPED" : "COMPLETED";

    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic claim: only one caller wins the ACTIVE -> ended transition.
      const claimed = await tx.chargingSession.updateMany({
        where: { id: session.id, status: "ACTIVE" },
        data: { status, energyWh, costKobo, endedAt, stopReason },
      });
      if (claimed.count === 0) {
        return { alreadyFinalized: true as const };
      }

      const s = await tx.chargingSession.findUniqueOrThrow({
        where: { id: session.id },
        include: { station: true },
      });

      const station = await tx.station.update({
        where: { id: session.stationId },
        data: { connectorsAvailable: { increment: 1 } },
      });
      if (station.status === "BUSY" && station.connectorsAvailable > 0) {
        await tx.station.update({
          where: { id: station.id },
          data: { status: "AVAILABLE" },
        });
      }

      // Settle the wallet in the SAME transaction: an ended session can never
      // be left without its CHARGE record, and the debit re-reads the balance.
      let debit = null;
      if (costKobo > 0) {
        const kwh = (energyWh / 1000).toFixed(2);
        debit = await this.walletService.debitForSessionTx(
          tx,
          session.userId,
          session.id,
          costKobo,
          `Charging at ${session.station.name} — ${kwh} kWh`,
        );
      }
      return { alreadyFinalized: false as const, session: s, debit };
    });

    if (result.alreadyFinalized) {
      // Another request settled this session first — return its final state.
      const finalized = await this.prisma.chargingSession.findUniqueOrThrow({
        where: { id: session.id },
        include: { station: true },
      });
      return this.toSessionDto(finalized);
    }

    if (result.debit) {
      await this.walletService.auditDebit(result.debit, correlationId);
    }

    const updated = result.session;

    await this.auditService.log({
      actorId: session.userId,
      action: AUDIT_ACTIONS.SESSION_STOPPED,
      resource: "charging_session",
      resourceId: session.id,
      result: "SUCCESS",
      correlationId,
      metadata: { energyWh, costKobo, stopReason },
    });

    return this.toSessionDto(updated);
  }

  async listSessions(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<SessionDto>> {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.chargingSession.findMany({
        where,
        include: { station: true },
        orderBy: { startedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.chargingSession.count({ where }),
    ]);
    return paginate(
      rows.map((r) => this.toSessionDto(r)),
      total,
      query.page,
      query.limit,
    );
  }

  async recentSessions(userId: string, take = 5): Promise<SessionDto[]> {
    const rows = await this.prisma.chargingSession.findMany({
      where: { userId, status: { not: "ACTIVE" } },
      include: { station: true },
      orderBy: { startedAt: "desc" },
      take,
    });
    return rows.map((r) => this.toSessionDto(r));
  }

  async lifetimeStats(userId: string): Promise<{
    sessionsCount: number;
    totalEnergyWh: number;
    totalSpentKobo: number;
  }> {
    const agg = await this.prisma.chargingSession.aggregate({
      where: { userId, status: { in: ["COMPLETED", "STOPPED"] } },
      _count: { id: true },
      _sum: { energyWh: true, costKobo: true },
    });
    return {
      sessionsCount: agg._count.id,
      totalEnergyWh: agg._sum.energyWh ?? 0,
      totalSpentKobo: agg._sum.costKobo ?? 0,
    };
  }
}

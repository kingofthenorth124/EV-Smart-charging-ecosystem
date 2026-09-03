/**
 * Module 2 concurrency & settlement invariants
 *
 * Covers:
 *  - First wallet access under parallel requests creates exactly one wallet
 *  - Parallel session starts for one user yield exactly one ACTIVE session
 *    (DB partial unique index invariant)
 *  - Parallel starts by different users cannot oversubscribe a station's
 *    connectors (guarded conditional decrement, availability never < 0)
 *  - Parallel stops settle the session exactly once: one CHARGE transaction,
 *    one wallet debit, one connector release
 */
import type { INestApplication } from "@nestjs/common";
import { createApp } from "../../test/test-app.factory";
import {
  cleanupTestUsers,
  uniqueEmail,
  uniquePhone,
} from "../../test/db-cleaner";
import { PrismaService } from "../database/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { ChargingService } from "./charging.service";

let app: INestApplication;
let prisma: PrismaService;
let walletService: WalletService;
let chargingService: ChargingService;

const emails: string[] = [];
const stationIds: string[] = [];

async function createUser(): Promise<string> {
  const email = uniqueEmail("module2");
  emails.push(email);
  const user = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "Customer",
      email,
      phone: uniquePhone() + String(Math.floor(Math.random() * 90) + 10),
      passwordHash: "x",
      status: "ACTIVE",
    },
  });
  return user.id;
}

async function createStation(connectors = 1) {
  const station = await prisma.station.create({
    data: {
      name: `Test Station ${Date.now()}-${Math.random()}`,
      location: "Test Location",
      powerKw: 3600, // 1 Wh per ms — meaningful cost accrues immediately
      connectorType: "CCS2",
      connectorsTotal: connectors,
      connectorsAvailable: connectors,
      tariffKoboPerKwh: 100000,
    },
  });
  stationIds.push(station.id);
  return station;
}

async function fundWallet(userId: string, amountKobo: number) {
  await walletService.getOrCreateWallet(userId);
  await walletService.topUp(userId, { amountKobo, method: "CARD" });
}

beforeAll(async () => {
  ({ app, prisma } = await createApp());
  walletService = app.get(WalletService);
  chargingService = app.get(ChargingService);
});

afterAll(async () => {
  await prisma.chargingSession.deleteMany({
    where: { stationId: { in: stationIds } },
  });
  await prisma.station.deleteMany({ where: { id: { in: stationIds } } });
  await cleanupTestUsers(prisma, emails);
  await app.close();
});

describe("wallet creation race", () => {
  it("parallel first access creates exactly one wallet", async () => {
    const userId = await createUser();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => walletService.getOrCreateWallet(userId)),
    );
    const walletIds = new Set(results.map((w) => w.id));
    expect(walletIds.size).toBe(1);
    expect(await prisma.wallet.count({ where: { userId } })).toBe(1);
  });
});

describe("wallet authorization", () => {
  it("rejects session start for a suspended wallet", async () => {
    const userId = await createUser();
    await fundWallet(userId, 1000000);
    await prisma.wallet.update({
      where: { userId },
      data: { status: "SUSPENDED" },
    });
    const station = await createStation(2);

    await expect(
      chargingService.startSession(userId, { stationId: station.id }),
    ).rejects.toMatchObject({ status: 403 });

    // No session created, no connector claimed.
    expect(await prisma.chargingSession.count({ where: { userId } })).toBe(0);
    const after = await prisma.station.findUniqueOrThrow({
      where: { id: station.id },
    });
    expect(after.connectorsAvailable).toBe(2);
  });

  it("rejects session start when wallet has less than the ₦1,000 authorization amount", async () => {
    const userId = await createUser();

    // Fund exactly ₦600 — below the temporary ₦1,000 authorization requirement.
    await fundWallet(userId, 60000);

    const station = await createStation(1);

    await expect(
      chargingService.startSession(userId, { stationId: station.id }),
    ).rejects.toMatchObject({
      status: 402,
    });

    // No charging session should have been created.
    expect(
      await prisma.chargingSession.count({
        where: { userId, status: "ACTIVE" },
      }),
    ).toBe(0);

    // The connector must not have been claimed.
    const after = await prisma.station.findUniqueOrThrow({
      where: { id: station.id },
    });

    expect(after.connectorsAvailable).toBe(1);
    expect(after.status).not.toBe("BUSY");

    // Authorization rejection must not debit the wallet.
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId },
    });

    expect(wallet.balanceKobo).toBe(60000);
  });
});

describe("session start races", () => {
  it("parallel starts for one user yield exactly one ACTIVE session", async () => {
    const userId = await createUser();
    await fundWallet(userId, 1000000);
    const station = await createStation(10);

    const outcomes = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        chargingService.startSession(userId, { stationId: station.id }),
      ),
    );

    const succeeded = outcomes.filter((o) => o.status === "fulfilled");
    expect(succeeded.length).toBe(1);
    expect(
      await prisma.chargingSession.count({
        where: { userId, status: "ACTIVE" },
      }),
    ).toBe(1);

    // Losers must not leak claimed connectors.
    const after = await prisma.station.findUniqueOrThrow({
      where: { id: station.id },
    });
    expect(after.connectorsAvailable).toBe(9);
  });

  it("parallel starts by different users cannot oversubscribe connectors", async () => {
    const station = await createStation(1);
    const users = await Promise.all([createUser(), createUser(), createUser()]);
    await Promise.all(users.map((u) => fundWallet(u, 1000000)));

    const outcomes = await Promise.allSettled(
      users.map((u) =>
        chargingService.startSession(u, { stationId: station.id }),
      ),
    );

    const succeeded = outcomes.filter((o) => o.status === "fulfilled");
    expect(succeeded.length).toBe(1);

    const after = await prisma.station.findUniqueOrThrow({
      where: { id: station.id },
    });
    expect(after.connectorsAvailable).toBe(0);
    expect(after.status).toBe("BUSY");
  });
});

describe("session settlement races", () => {
  it("parallel stops settle exactly once: one CHARGE transaction, one debit, one connector release", async () => {
    const userId = await createUser();
    const fundedKobo = 1000000;
    await fundWallet(userId, fundedKobo);
    const station = await createStation(2);

    const session = await chargingService.startSession(userId, {
      stationId: station.id,
    });
    await new Promise((r) => setTimeout(r, 1200)); // accrue ≥1s so cost is non-zero (elapsed is whole seconds)

    const outcomes = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        chargingService.stopSession(userId, session.id),
      ),
    );

    // Every settled call reports the same final session state (idempotent),
    // and racing callers either get that state or a "not active" conflict.
    const fulfilled = outcomes.filter(
      (
        o,
      ): o is PromiseFulfilledResult<
        Awaited<ReturnType<ChargingService["stopSession"]>>
      > => o.status === "fulfilled",
    );
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    for (const o of fulfilled) {
      expect(o.value.status).toBe("STOPPED");
    }

    const final = await prisma.chargingSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(final.status).toBe("STOPPED");
    expect(final.costKobo).toBeGreaterThan(0);

    // Exactly one CHARGE transaction, wallet debited exactly once.
    const charges = await prisma.walletTransaction.findMany({
      where: { sessionId: session.id, type: "CHARGE" },
    });
    expect(charges.length).toBe(1);
    expect(charges[0].amountKobo).toBe(-final.costKobo);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(wallet.balanceKobo).toBe(fundedKobo - final.costKobo);
    expect(wallet.balanceKobo).toBeGreaterThanOrEqual(0);

    // Connector released exactly once.
    const after = await prisma.station.findUniqueOrThrow({
      where: { id: station.id },
    });
    expect(after.connectorsAvailable).toBe(2);
  });

  it("ended sessions always carry their CHARGE record (settlement is transactional)", async () => {
    const userId = await createUser();
    await fundWallet(userId, 500000);
    const station = await createStation(1);

    const session = await chargingService.startSession(userId, {
      stationId: station.id,
    });
    await new Promise((r) => setTimeout(r, 60));
    const stopped = await chargingService.stopSession(userId, session.id);

    expect(stopped.stopReason).toBe("USER_STOP");
    const charges = await prisma.walletTransaction.count({
      where: { sessionId: session.id, type: "CHARGE" },
    });
    expect(charges).toBe(stopped.costKobo > 0 ? 1 : 0);
  });
});

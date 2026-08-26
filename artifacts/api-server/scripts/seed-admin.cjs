#!/usr/bin/env node
/**
 * Admin Bootstrap Seed
 * ─────────────────────
 * Creates the first SUPER_ADMIN account for the Camel Mobility platform.
 *
 * Safety gates:
 *   - ADMIN_BOOTSTRAP_SECRET must be set (prevents accidental execution).
 *   - Idempotent: re-running with the same email silently exits if the
 *     user already has SUPER_ADMIN role.
 *
 * Required environment variables:
 *   ADMIN_BOOTSTRAP_SECRET  — arbitrary secret; must be present to run
 *   ADMIN_EMAIL             — admin login email
 *   ADMIN_PHONE             — admin phone in E.164 format (+234...)
 *   ADMIN_PASSWORD          — initial password (min 12 chars; change on first login)
 *   DATABASE_URL            — runtime-managed by Replit (already set)
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run seed:admin
 */

"use strict";

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const bcrypt = require("bcryptjs");

// ── Validation ────────────────────────────────────────────────────────────────

const requiredVars = [
  "ADMIN_BOOTSTRAP_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PHONE",
  "ADMIN_PASSWORD",
  "DATABASE_URL",
];

const missing = requiredVars.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    `\n[seed-admin] ❌ Missing required environment variables:\n  ${missing.join("\n  ")}\n`,
  );
  process.exit(1);
}

const {
  ADMIN_BOOTSTRAP_SECRET,
  ADMIN_EMAIL,
  ADMIN_PHONE,
  ADMIN_PASSWORD,
  DATABASE_URL,
} = process.env;

if (ADMIN_BOOTSTRAP_SECRET.length < 16) {
  console.error(
    "\n[seed-admin] ❌ ADMIN_BOOTSTRAP_SECRET must be at least 16 characters.\n",
  );
  process.exit(1);
}

if (ADMIN_PASSWORD.length < 12) {
  console.error(
    "\n[seed-admin] ❌ ADMIN_PASSWORD must be at least 12 characters.\n",
  );
  process.exit(1);
}

// Basic email sanity check
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ADMIN_EMAIL)) {
  console.error(
    "\n[seed-admin] ❌ ADMIN_EMAIL does not look like a valid email address.\n",
  );
  process.exit(1);
}

// Phone: must be non-empty (any format accepted; uniqueness enforced by DB)
if (!ADMIN_PHONE || ADMIN_PHONE.trim().length < 4) {
  console.error(
    "\n[seed-admin] ❌ ADMIN_PHONE must be a non-empty phone number.\n",
  );
  process.exit(1);
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("\n[seed-admin] Checking for existing SUPER_ADMIN...");

    const existing = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true, role: true, status: true },
    });

    if (existing) {
      if (existing.role === "SUPER_ADMIN") {
        console.log(
          `[seed-admin] ✅ Account ${ADMIN_EMAIL} already exists as SUPER_ADMIN — nothing to do.\n`,
        );
        return;
      }

      // Email exists but is not SUPER_ADMIN — upgrade the role
      console.log(
        `[seed-admin] ⚡ Account ${ADMIN_EMAIL} found with role ${existing.role} — upgrading to SUPER_ADMIN...`,
      );
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          passwordHash,
          phone: ADMIN_PHONE,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      console.log(
        `[seed-admin] ✅ Account upgraded to SUPER_ADMIN and set ACTIVE.\n`,
      );
      return;
    }

    // No existing account — create from scratch
    console.log(`[seed-admin] Creating new SUPER_ADMIN: ${ADMIN_EMAIL}`);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const admin = await prisma.user.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        registrationSource: "ADMIN_SEED",
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    console.log(`[seed-admin] ✅ SUPER_ADMIN created successfully.`);
    console.log(`             ID:     ${admin.id}`);
    console.log(`             Email:  ${admin.email}`);
    console.log(`             Status: ${admin.status}`);
    console.log(`             At:     ${admin.createdAt.toISOString()}`);
    console.log(`\n[seed-admin] Login at /login with: ${admin.email}`);
    console.log("[seed-admin] ⚠️  Change the password after first login.\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("\n[seed-admin] ❌ Seed failed:", err.message ?? err);
  process.exit(1);
});

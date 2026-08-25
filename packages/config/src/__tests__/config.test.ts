import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  API_VERSION,
  PLATFORM_NAME,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ACCESS_TOKEN_TTL_SECONDS,
  KOBO_PER_NAIRA,
  MIN_TOPUP_KOBO,
  MAX_TOPUP_KOBO,
  MAX_WALLET_BALANCE_KOBO,
  CORRELATION_ID_HEADER,
  resolveEnvironment,
  isProduction,
  isDevelopment,
  isTest,
} from "../index";

describe("platform constants", () => {
  it("exports the correct API version", () => {
    expect(API_VERSION).toBe("v1");
  });

  it("exports the correct platform name", () => {
    expect(PLATFORM_NAME).toBe("Camel Mobility Wallet");
  });

  it("has sane pagination defaults", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(MAX_PAGE_SIZE).toBe(100);
  });

  it("access token TTL is 15 minutes in seconds", () => {
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(900);
  });
});

describe("wallet constants", () => {
  it("kobo per naira is 100", () => {
    expect(KOBO_PER_NAIRA).toBe(100);
  });

  it("minimum top-up is ₦100 (10,000 kobo)", () => {
    expect(MIN_TOPUP_KOBO).toBe(10_000);
  });

  it("maximum top-up is ₦500,000 (50,000,000 kobo)", () => {
    expect(MAX_TOPUP_KOBO).toBe(50_000_000);
  });

  it("max wallet balance is ₦2,000,000 (200,000,000 kobo)", () => {
    expect(MAX_WALLET_BALANCE_KOBO).toBe(200_000_000);
  });
});

describe("API constants", () => {
  it("correlation ID header is lowercase", () => {
    expect(CORRELATION_ID_HEADER).toBe("x-correlation-id");
  });
});

describe("resolveEnvironment", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("returns test when NODE_ENV=test", () => {
    process.env.NODE_ENV = "test";
    expect(resolveEnvironment()).toBe("test");
  });

  it("returns production when NODE_ENV=production", () => {
    process.env.NODE_ENV = "production";
    expect(resolveEnvironment()).toBe("production");
  });

  it("defaults to development for unknown values", () => {
    process.env.NODE_ENV = "unknown";
    expect(resolveEnvironment()).toBe("development");
  });
});

describe("isTest / isDevelopment / isProduction", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("isTest returns true in test environment", () => {
    process.env.NODE_ENV = "test";
    expect(isTest()).toBe(true);
    expect(isDevelopment()).toBe(false);
    expect(isProduction()).toBe(false);
  });
});

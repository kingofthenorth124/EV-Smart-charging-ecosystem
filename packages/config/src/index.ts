/**
 * @workspace/config — Platform Foundation Constants
 *
 * Shared platform configuration constants.
 * Never put secrets here — use environment variables and injection.
 */

// ─── Platform ─────────────────────────────────────────────────────────────────

export const API_VERSION = "v1" as const;
export const PLATFORM_VERSION = "1.0.0" as const;
export const PLATFORM_NAME = "Camel Mobility Wallet" as const;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── Authentication ───────────────────────────────────────────────────────────

/** Default access token TTL — override with JWT_ACCESS_EXPIRES_IN env var. */
export const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = "15m" as const;

/** Default refresh token TTL — override with JWT_REFRESH_EXPIRES_IN env var. */
export const DEFAULT_REFRESH_TOKEN_EXPIRES_IN = "7d" as const;

/** Access token TTL in seconds (for AuthTokens.expiresIn). Must match DEFAULT_ACCESS_TOKEN_EXPIRES_IN. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Failed login attempts before account is locked. */
export const DEFAULT_ACCOUNT_LOCKOUT_ATTEMPTS = 5;

/** Account lockout duration after exceeding failed attempts (minutes). */
export const DEFAULT_ACCOUNT_LOCKOUT_DURATION_MINUTES = 15;

/** Password reset token expiry (minutes). */
export const DEFAULT_PASSWORD_RESET_EXPIRES_MINUTES = 60;

// ─── Security ────────────────────────────────────────────────────────────────

/** bcrypt work factor. 12 rounds is the recommended minimum for production. */
export const DEFAULT_BCRYPT_ROUNDS = 12;

// ─── Frontend storage keys ────────────────────────────────────────────────────

export const AUTH_ACCESS_TOKEN_KEY = "cmw_access_token" as const;
export const AUTH_REFRESH_TOKEN_KEY = "cmw_refresh_token" as const;

// ─── Wallet (Module 2) ────────────────────────────────────────────────────────

/** Currency: Nigerian Naira in kobo. 1 ₦ = 100 kobo. */
export const KOBO_PER_NAIRA = 100;

/** Minimum top-up amount in kobo (₦100). */
export const MIN_TOPUP_KOBO = 10_000;

/** Maximum top-up amount per transaction in kobo (₦500,000). */
export const MAX_TOPUP_KOBO = 50_000_000;

/** Maximum wallet balance in kobo (₦2,000,000). */
export const MAX_WALLET_BALANCE_KOBO = 200_000_000;

/** Minimum charging session spend cap in kobo (₦10). */
export const MIN_SESSION_LIMIT_KOBO = 1_000;

/** Silent token refresh — rotate this many ms before the access token expires. */
export const TOKEN_REFRESH_SKEW_MS = 60_000;

// ─── Charging (Module 2) ─────────────────────────────────────────────────────

/** Maximum active charging session duration before auto-stop (hours). */
export const MAX_SESSION_HOURS = 12;

/** Live session poll interval for the frontend (ms). */
export const SESSION_POLL_INTERVAL_MS = 5_000;

// ─── API ──────────────────────────────────────────────────────────────────────

/** Correlation ID header name (echoed on every response). */
export const CORRELATION_ID_HEADER = "x-correlation-id" as const;

/** Acceptance-test throttle bypass header (non-production only). */
export const ACCEPTANCE_TEST_HEADER = "x-acceptance-test" as const;

// ─── Environment helpers ─────────────────────────────────────────────────────

export type AppEnvironment =
  "development" | "test" | "sandbox" | "staging" | "production";

/**
 * Resolve the current runtime environment from NODE_ENV.
 * Defaults to 'development' when unset.
 */
export function resolveEnvironment(): AppEnvironment {
  const env = (
    typeof process !== "undefined" ? process.env.NODE_ENV : undefined
  ) as string | undefined;
  switch (env) {
    case "production":
      return "production";
    case "test":
      return "test";
    case "staging":
      return "staging";
    case "sandbox":
      return "sandbox";
    default:
      return "development";
  }
}

export function isProduction(): boolean {
  return resolveEnvironment() === "production";
}

export function isDevelopment(): boolean {
  return resolveEnvironment() === "development";
}

export function isTest(): boolean {
  return resolveEnvironment() === "test";
}

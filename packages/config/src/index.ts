/**
 * @workspace/config — Module 1: Platform Foundation Constants
 *
 * Shared platform configuration constants.
 * Scope: Module 1 only. Business-domain constants (wallet limits, etc.)
 * are added when those modules are implemented.
 */

// ─── API ──────────────────────────────────────────────────────────────────────

export const API_VERSION = 'v1' as const;
export const PLATFORM_VERSION = '1.0.0' as const;
export const PLATFORM_NAME = 'Camel Mobility Wallet' as const;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * Default access token TTL. Overridden by JWT_ACCESS_EXPIRES_IN env var.
 * Short-lived for security — refresh tokens extend sessions.
 */
export const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = '15m' as const;

/**
 * Default refresh token TTL. Overridden by JWT_REFRESH_EXPIRES_IN env var.
 */
export const DEFAULT_REFRESH_TOKEN_EXPIRES_IN = '7d' as const;

/**
 * Access token TTL in seconds (for AuthTokens.expiresIn field).
 * Must match DEFAULT_ACCESS_TOKEN_EXPIRES_IN.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

/**
 * Number of consecutive failed login attempts before account is locked.
 */
export const DEFAULT_ACCOUNT_LOCKOUT_ATTEMPTS = 5;

/**
 * Duration of account lockout after exceeding failed login attempts, in minutes.
 */
export const DEFAULT_ACCOUNT_LOCKOUT_DURATION_MINUTES = 15;

/**
 * Password reset token expiry in minutes.
 */
export const DEFAULT_PASSWORD_RESET_EXPIRES_MINUTES = 60;

// ─── Security ────────────────────────────────────────────────────────────────

/**
 * bcrypt work factor. Higher = more secure but slower.
 * 12 rounds is the recommended minimum for production.
 */
export const DEFAULT_BCRYPT_ROUNDS = 12;

// ─── Frontend storage keys ────────────────────────────────────────────────────

export const AUTH_ACCESS_TOKEN_KEY = 'cmw_access_token' as const;
export const AUTH_REFRESH_TOKEN_KEY = 'cmw_refresh_token' as const;

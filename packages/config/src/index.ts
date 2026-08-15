/**
 * @workspace/config
 *
 * Authoritative business rule constants and platform configuration.
 * These values are configurable through Super Admin controls in production.
 * The backend remains the authoritative enforcement point.
 * Frontend may read these for UX purposes ONLY — never as security enforcement.
 */

// ─── Financial Business Rules ─────────────────────────────────────────────────

/**
 * Minimum wallet balance required to authorize a charging session.
 * ₦50,000 expressed in kobo (100 kobo = ₦1).
 * Business Rule: A customer below this balance cannot start charging.
 */
export const MIN_CHARGING_WALLET_BALANCE_KOBO = 5_000_000; // ₦50,000

/**
 * Minimum wallet top-up amount.
 * ₦50,000 expressed in kobo.
 * Business Rule: Top-ups below this amount must be rejected.
 */
export const MIN_TOP_UP_AMOUNT_KOBO = 5_000_000; // ₦50,000

/**
 * Currency used by the platform.
 */
export const PLATFORM_CURRENCY = 'NGN' as const;

/**
 * Kobo per Naira conversion factor.
 */
export const KOBO_PER_NAIRA = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert kobo to Naira (display purpose only — never use for financial calculation).
 */
export function koboToNaira(kobo: number): number {
  return kobo / KOBO_PER_NAIRA;
}

/**
 * Convert Naira to kobo.
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * KOBO_PER_NAIRA);
}

/**
 * Format a kobo amount as a Naira display string (e.g. "₦50,000.00").
 */
export function formatNaira(kobo: number): string {
  const naira = koboToNaira(kobo);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(naira);
}

// ─── NFC Card ─────────────────────────────────────────────────────────────────

/**
 * NFC card status that allows charging authorization.
 */
export const NFC_CARD_ACTIVE_STATUS = 'ACTIVE' as const;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── API ──────────────────────────────────────────────────────────────────────

export const API_VERSION = 'v1';
export const PLATFORM_VERSION = '1.0.0';

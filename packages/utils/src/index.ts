/**
 * @workspace/utils
 *
 * Shared, domain-agnostic utilities.
 * No business rules here — domain logic belongs in domain services.
 */

/**
 * Format a Date or ISO string as a human-readable local date.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Format a Date or ISO string as a local date-time string.
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Format a duration in seconds as "Hh Mm" or "Mm Ss".
 */
export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/**
 * Truncate a string at maxLength and append "…" if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

/**
 * Returns a masked version of a card identifier for display.
 * e.g. "ABCD1234" → "****1234"
 */
export function maskCardId(cardIdentifier: string): string {
  if (cardIdentifier.length <= 4) return cardIdentifier;
  return "*".repeat(cardIdentifier.length - 4) + cardIdentifier.slice(-4);
}

/**
 * Generate a simple idempotency key for a request.
 */
export function generateIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a query string into an object.
 */
export function parseQuery(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

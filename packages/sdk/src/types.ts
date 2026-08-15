/**
 * SDK-level configuration and result types.
 */

/** Options for initialising the Camel Mobility SDK client. */
export interface SdkClientOptions {
  /**
   * Base URL of the API server.
   * Typically not needed in web apps (same-origin requests), but required
   * for mobile (Expo) bundles that call a remote API.
   */
  baseUrl?: string;

  /**
   * Async getter that returns the current bearer access token.
   * Required for Expo / native clients. Not needed in web apps that rely
   * on cookie-based auth or in-memory token management.
   */
  authTokenGetter?: () => Promise<string | null> | string | null;

  /**
   * Returns additional headers attached to every request.
   * Useful for correlation IDs or custom request metadata.
   */
  defaultHeadersGetter?: () => Record<string, string>;
}

/** Generic SDK result wrapper — discriminated union for typed error handling. */
export type SdkResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: import('./errors').SdkError };

/** Wrap a promise so it never throws — returns a typed SdkResult instead. */
export async function wrapResult<T>(fn: () => Promise<T>): Promise<SdkResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    const { SdkError } = await import('./errors');
    if (err instanceof SdkError) return { ok: false, error: err };
    // Re-throw unexpected non-SDK errors (network failures, etc.)
    throw err;
  }
}

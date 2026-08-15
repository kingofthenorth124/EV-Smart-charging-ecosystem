/**
 * Token management for the Camel Mobility Wallet.
 *
 * - Access token (short-lived JWT) is kept in memory only — never persisted.
 * - Refresh token (opaque, rotated on use) is persisted in localStorage so a
 *   session survives a page reload.
 * - Silent refresh: a timer rotates the token pair ~60s before the access
 *   token expires; the auth token getter also refreshes on-demand
 *   (single-flight) if the access token is missing/expired when a request
 *   needs it.
 */
import { refreshTokens as apiRefreshTokens } from '@workspace/api-client-react';
import type { AuthTokens } from '@workspace/api-client-react';

const REFRESH_TOKEN_KEY = 'camel_refresh_token';
/** Refresh this many ms before the access token actually expires. */
const REFRESH_SKEW_MS = 60_000;

let accessToken: string | null = null;
let accessTokenExpiresAt = 0; // epoch ms
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<string | null> | null = null;

type SessionExpiredListener = () => void;
let onSessionExpired: SessionExpiredListener | null = null;

export function setSessionExpiredListener(listener: SessionExpiredListener | null) {
  onSessionExpired = listener;
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeTokens(tokens: AuthTokens): void {
  accessToken = tokens.accessToken;
  accessTokenExpiresAt = Date.now() + tokens.expiresIn * 1000;
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    // Storage unavailable — session will not survive a reload.
  }
  scheduleSilentRefresh(tokens.expiresIn * 1000);
}

export function clearTokens(): void {
  accessToken = null;
  accessTokenExpiresAt = 0;
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

function scheduleSilentRefresh(ttlMs: number): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  const delay = Math.max(ttlMs - REFRESH_SKEW_MS, 5_000);
  refreshTimer = setTimeout(() => {
    void refreshSession();
  }, delay);
}

/**
 * Rotate the token pair using the stored refresh token. Single-flight: many
 * concurrent callers share one refresh request. Returns the new access token,
 * or null when there is no valid session (listener notified).
 */
export function refreshSession(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return Promise.resolve(null);

  // skipAuth: the refresh call must NOT consult the auth-token getter —
  // the getter awaits this very promise, which would deadlock.
  refreshInFlight = apiRefreshTokens({ refreshToken }, { skipAuth: true } as RequestInit)
    .then((tokens) => {
      storeTokens(tokens);
      return tokens.accessToken;
    })
    .catch((error: unknown) => {
      // Refresh token invalid/expired/revoked — the session is over.
      clearTokens();
      onSessionExpired?.();
      console.warn('Session refresh failed', error);
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/**
 * Bearer token getter wired into the API client. Returns a valid access
 * token, silently refreshing first when the current one is missing or about
 * to expire.
 */
export async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < accessTokenExpiresAt - 5_000) {
    return accessToken;
  }
  return refreshSession();
}

export function hasSession(): boolean {
  return getStoredRefreshToken() !== null;
}

/**
 * Prepare for logout: cancel the silent-refresh timer (so no rotation can
 * race the revocation call), ensure the access token is valid — which waits
 * for / performs any in-flight rotation — and only THEN read the current
 * refresh token. Returns the refresh token that must be revoked server-side,
 * or null when the session is already gone.
 *
 * Reading the refresh token before ensuring a valid access token is a bug:
 * the authenticated logout request would trigger a silent refresh that
 * rotates the pair, and the old token in the request body would already be
 * revoked — leaving the freshly issued one valid server-side.
 */
export async function beginLogout(): Promise<string | null> {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  const token = await getAccessToken();
  // getAccessToken may have rotated tokens and re-armed the timer — disarm it
  // again so nothing rotates while the logout request is in flight.
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  if (!token) return null;
  return getStoredRefreshToken();
}

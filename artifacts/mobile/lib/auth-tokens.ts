/**
 * Token management for Camel Mobility mobile app.
 *
 * Mirrors artifacts/web/src/lib/auth-tokens.ts but uses AsyncStorage
 * instead of localStorage for React Native compatibility.
 *
 * - Access token (short-lived JWT) kept in memory only.
 * - Refresh token stored in AsyncStorage so a session survives app restarts.
 * - Silent refresh rotates the pair ~60s before the access token expires.
 * - Single-flight: concurrent callers share one refresh request.
 */
import * as SecureStore from 'expo-secure-store';
import { refreshTokens as apiRefreshTokens } from '@workspace/api-client-react';
import type { AuthTokens } from '@workspace/api-client-react';

const REFRESH_TOKEN_KEY = 'camel_refresh_token';
/** Refresh this many ms before the access token actually expires. */
const REFRESH_SKEW_MS = 60_000;

// Module-level state — shared across all renders, survives re-mounts.
let _accessToken: string | null = null;
let _accessTokenExpiresAt = 0;
let _refreshToken: string | null = null;
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;
let _refreshInFlight: Promise<string | null> | null = null;
let _onSessionExpired: (() => void) | null = null;

export function setSessionExpiredListener(listener: (() => void) | null): void {
  _onSessionExpired = listener;
}

/**
 * Load the persisted refresh token from AsyncStorage into module memory.
 * Call once on app startup before any API requests are made.
 */
export async function loadStoredRefreshToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    _refreshToken = token;
    return token;
  } catch {
    return null;
  }
}

/** Synchronous read of the in-memory refresh token (after loadStoredRefreshToken). */
export function getRefreshToken(): string | null {
  return _refreshToken;
}

export function storeTokens(tokens: AuthTokens): void {
  _accessToken = tokens.accessToken;
  _accessTokenExpiresAt = Date.now() + tokens.expiresIn * 1000;
  _refreshToken = tokens.refreshToken;
  scheduleSilentRefresh(tokens.expiresIn * 1000);
  SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken).catch(() => {});
}

export function clearTokens(): void {
  _accessToken = null;
  _accessTokenExpiresAt = 0;
  _refreshToken = null;
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
  SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
}

function scheduleSilentRefresh(ttlMs: number): void {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  const delay = Math.max(ttlMs - REFRESH_SKEW_MS, 5_000);
  _refreshTimer = setTimeout(() => {
    void refreshSession();
  }, delay);
}

/**
 * Rotate the token pair using the stored refresh token.
 * Single-flight: many concurrent callers share one refresh request.
 */
export function refreshSession(): Promise<string | null> {
  if (_refreshInFlight) return _refreshInFlight;
  if (!_refreshToken) return Promise.resolve(null);

  // skipAuth prevents the getter from triggering a nested refresh — deadlock guard.
  _refreshInFlight = apiRefreshTokens(
    { refreshToken: _refreshToken },
    { skipAuth: true } as RequestInit,
  )
    .then((tokens) => {
      storeTokens(tokens);
      return tokens.accessToken;
    })
    .catch((error: unknown) => {
      clearTokens();
      _onSessionExpired?.();
      console.warn('[auth-tokens] Session refresh failed', error);
      return null;
    })
    .finally(() => {
      _refreshInFlight = null;
    });

  return _refreshInFlight;
}

/**
 * Bearer token getter wired into the API client via setAuthTokenGetter.
 * Returns a valid access token, silently refreshing first when needed.
 */
export async function getAccessToken(): Promise<string | null> {
  if (_accessToken && Date.now() < _accessTokenExpiresAt - 5_000) {
    return _accessToken;
  }
  return refreshSession();
}

export function hasSession(): boolean {
  return _refreshToken !== null;
}

/**
 * Prepare for logout.
 *
 * Mirrors artifacts/web/src/lib/auth-tokens.ts#beginLogout to prevent
 * the same token-rotation race:
 *
 *  1. Cancel the silent-refresh timer so nothing rotates while logout is
 *     in flight.
 *  2. Ensure a valid access token (waits for / performs any in-flight
 *     rotation) — the logout request needs it to be authenticated.
 *  3. Disarm the timer again in case step 2 re-armed it.
 *  4. Return the current refresh token that must be revoked server-side,
 *     or null when the session is already gone.
 *
 * Reading the refresh token before ensuring a valid access token is a
 * bug: the auth-token getter would trigger a silent refresh that rotates
 * the pair, so the token in the logout body would already be revoked and
 * the freshly issued one would remain valid server-side.
 */
export async function beginLogout(): Promise<string | null> {
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
  // getAccessToken may trigger a refresh and re-arm the timer.
  const token = await getAccessToken();
  // Disarm again so nothing rotates while the request is in flight.
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
  if (!token) return null;
  return _refreshToken;
}

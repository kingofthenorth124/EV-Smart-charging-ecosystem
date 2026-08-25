/**
 * Regression tests for the silent-refresh flow:
 * 1. The refresh request must bypass the auth-token getter (skipAuth) —
 *    otherwise an expired access token deadlocks the refresh.
 * 2. Session bootstrap (no access token, stored refresh token) must resolve.
 * 3. storeTokens must schedule a silent refresh before expiry.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshTokensMock = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  refreshTokens: (...args: unknown[]) => refreshTokensMock(...args),
}));

// Minimal localStorage stub (node environment).
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

const TOKENS = {
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresIn: 900,
  tokenType: "Bearer" as const,
};

describe("auth token manager", () => {
  let auth: typeof import("../auth-tokens");

  beforeEach(async () => {
    vi.useFakeTimers();
    store.clear();
    refreshTokensMock.mockReset();
    vi.resetModules();
    auth = await import("../auth-tokens");
  });

  afterEach(() => {
    auth.clearTokens();
    vi.useRealTimers();
  });

  it("bootstrap: getAccessToken resolves via refresh when only a refresh token is stored", async () => {
    store.set("camel_refresh_token", "refresh-0");
    refreshTokensMock.mockResolvedValue(TOKENS);

    const token = await auth.getAccessToken();

    expect(token).toBe("access-1");
    expect(refreshTokensMock).toHaveBeenCalledTimes(1);
    // Rotated refresh token persisted.
    expect(store.get("camel_refresh_token")).toBe("refresh-1");
  });

  it("the refresh request itself bypasses the auth-token getter (skipAuth) — no deadlock", async () => {
    store.set("camel_refresh_token", "refresh-0");
    refreshTokensMock.mockResolvedValue(TOKENS);

    await auth.getAccessToken();

    const [, options] = refreshTokensMock.mock.calls[0] as [
      unknown,
      { skipAuth?: boolean },
    ];
    expect(options?.skipAuth).toBe(true);
  });

  it("concurrent getAccessToken calls share a single in-flight refresh", async () => {
    store.set("camel_refresh_token", "refresh-0");
    refreshTokensMock.mockResolvedValue(TOKENS);

    const [a, b] = await Promise.all([
      auth.getAccessToken(),
      auth.getAccessToken(),
    ]);

    expect(a).toBe("access-1");
    expect(b).toBe("access-1");
    expect(refreshTokensMock).toHaveBeenCalledTimes(1);
  });

  it("storeTokens schedules a silent refresh before expiry", async () => {
    refreshTokensMock.mockResolvedValue({
      ...TOKENS,
      accessToken: "access-2",
      refreshToken: "refresh-2",
    });
    auth.storeTokens(TOKENS);

    expect(refreshTokensMock).not.toHaveBeenCalled();
    // 900s TTL - 60s skew = 840s until the scheduled refresh.
    await vi.advanceTimersByTimeAsync(841_000);

    expect(refreshTokensMock).toHaveBeenCalledTimes(1);
    expect(store.get("camel_refresh_token")).toBe("refresh-2");
  });

  it("logout with an expired access token revokes the CURRENT (rotated) refresh token", async () => {
    // Session state: refresh token stored, access token expired/absent.
    store.set("camel_refresh_token", "refresh-old");
    refreshTokensMock.mockResolvedValue(TOKENS); // rotation: refresh-old -> refresh-1

    const tokenToRevoke = await auth.beginLogout();

    // beginLogout must complete the silent refresh FIRST and hand back the
    // rotated token — submitting 'refresh-old' would leave 'refresh-1' valid
    // server-side after an apparently successful logout.
    expect(refreshTokensMock).toHaveBeenCalledTimes(1);
    expect(tokenToRevoke).toBe("refresh-1");
    expect(tokenToRevoke).not.toBe("refresh-old");

    // The silent-refresh timer is disarmed: no rotation can race revocation.
    await vi.advanceTimersByTimeAsync(2_000_000);
    expect(refreshTokensMock).toHaveBeenCalledTimes(1);
  });

  it("logout with a dead session returns null without calling the API", async () => {
    expect(await auth.beginLogout()).toBeNull();
    expect(refreshTokensMock).not.toHaveBeenCalled();
  });

  it("a failed refresh clears the session and notifies the listener", async () => {
    store.set("camel_refresh_token", "refresh-expired");
    refreshTokensMock.mockRejectedValue(new Error("HTTP 401"));
    const expired = vi.fn();
    auth.setSessionExpiredListener(expired);

    const token = await auth.getAccessToken();

    expect(token).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(
      store.has?.("camel_refresh_token") ??
        store.get("camel_refresh_token") !== undefined,
    ).toBe(false);
  });
});

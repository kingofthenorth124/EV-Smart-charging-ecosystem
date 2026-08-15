/**
 * Verifies customFetch's skipAuth contract at the fetch layer: a request with
 * skipAuth must never consult the auth-token getter, while a normal request
 * does. This is what prevents the refresh-endpoint deadlock.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  customFetch,
  setAuthTokenGetter,
  type CustomFetchOptions,
} from '@workspace/api-client-react';

const okJson = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('customFetch skipAuth', () => {
  afterEach(() => {
    setAuthTokenGetter(null);
    vi.unstubAllGlobals();
  });

  it('does not call the auth-token getter when skipAuth is set', async () => {
    const getter = vi.fn().mockResolvedValue('token-123');
    setAuthTokenGetter(getter);
    const fetchMock = vi.fn().mockResolvedValue(okJson());
    vi.stubGlobal('fetch', fetchMock);

    await customFetch('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'r' }),
      skipAuth: true,
    } satisfies CustomFetchOptions);

    expect(getter).not.toHaveBeenCalled();
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.has('authorization')).toBe(false);
  });

  it('attaches the bearer token on normal requests', async () => {
    const getter = vi.fn().mockResolvedValue('token-123');
    setAuthTokenGetter(getter);
    const fetchMock = vi.fn().mockResolvedValue(okJson());
    vi.stubGlobal('fetch', fetchMock);

    await customFetch('/api/v1/auth/me');

    expect(getter).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer token-123');
  });
});

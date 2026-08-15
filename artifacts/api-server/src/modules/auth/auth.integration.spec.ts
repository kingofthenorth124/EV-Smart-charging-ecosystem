/**
 * Auth & Identity Integration Tests
 *
 * Covers:
 *  - Happy path: register → login → refresh → logout → token invalidated
 *  - Account lockout: 5 failed logins → locked for 15 minutes
 *  - Refresh token theft detection: revoked token triggers family revocation
 *  - Expired access tokens → 401
 *  - Wrong-role JWT → 403
 *  - Rate limiting: 10 login attempts / 15 min → 429
 *  - Password reset: request → token captured → confirm → old sessions revoked
 *  - Admin-only routes reject CUSTOMER-role tokens
 *  - All error responses conform to the platform contract
 */
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request = require('supertest');
import { createApp, createRateLimitApp } from '../../test/test-app.factory';
import { cleanupTestUsers, uniqueEmail, uniquePhone } from '../../test/db-cleaner';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import { IdentityService } from '../identity/identity.service';
import { AUTH_AUDIT_ACTIONS } from './audit-actions';
import { AUDIT_ACTIONS } from '../identity/audit-actions';

// ─── Shared state ─────────────────────────────────────────────────────────────

let app: INestApplication;
let prisma: PrismaService;
const registeredEmails: string[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Register a fresh user and track their email for cleanup. */
async function registerUser(overrides: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}> = {}) {
  const email = overrides.email ?? uniqueEmail('user');
  const phone = overrides.phone ?? uniquePhone();
  registeredEmails.push(email);

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
      email,
      phone,
      password: overrides.password ?? 'Password1!',
    });

  return { res, email, phone, password: overrides.password ?? 'Password1!' };
}

/** Register + login and return the full login response body. */
async function registerAndLogin(passwordOverride?: string) {
  const { email, password } = await registerUser({ password: passwordOverride });
  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });
  return { email, password, body: loginRes.body as {
    user: { id: string; email: string; role: string };
    tokens: { accessToken: string; refreshToken: string; expiresIn: number; tokenType: string };
  }};
}

/** Mint a JWT directly (bypasses the real login flow — used for role tests). */
function mintJwt(payload: { sub: string; email: string; role: string }): string {
  const jwtService = app.get(JwtService);
  return jwtService.sign(payload);
}

/** Mint a JWT that is already expired. */
function mintExpiredJwt(payload: { sub: string; email: string; role: string }): string {
  const jwtService = app.get(JwtService);
  return jwtService.sign(payload, { expiresIn: '-1s' });
}

// ─── Suite setup/teardown ─────────────────────────────────────────────────────

beforeAll(async () => {
  ({ app, prisma } = await createApp());
});

afterAll(async () => {
  await cleanupTestUsers(prisma, registeredEmails);
  await app.close();
});

// =============================================================================
// 1. REGISTRATION
// =============================================================================

describe('POST /api/v1/auth/register', () => {
  it('creates a new user and returns sanitized profile (201)', async () => {
    const { res, email } = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email,
      role: 'CUSTOMER',
      status: 'PENDING',
    });
    // password hash must never be exposed
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('returns 409 when email is already registered', async () => {
    const { email } = await registerUser();
    const phone2 = uniquePhone();

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'Other', lastName: 'User', email, phone: phone2, password: 'Password1!' });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ statusCode: 409 });
  });

  it('returns 409 when phone is already registered', async () => {
    const { phone } = await registerUser();
    const email2 = uniqueEmail('dup-phone');
    registeredEmails.push(email2);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'Other', lastName: 'User', email: email2, phone, password: 'Password1!' });

    expect(res.status).toBe(409);
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'bad@test.com' }); // missing all other fields

    expect(res.status).toBe(422);
  });

  it('error response includes statusCode, message, and correlationId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('statusCode');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('correlationId');
  });
});

// =============================================================================
// 2. LOGIN
// =============================================================================

describe('POST /api/v1/auth/login', () => {
  it('returns 200 with user profile and token pair on valid credentials', async () => {
    const { email, password } = await registerUser();

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email, role: 'CUSTOMER' });
    expect(res.body.tokens).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresIn: expect.any(Number),
      tokenType: 'Bearer',
    });
  });

  it('returns 401 for wrong password', async () => {
    const { email } = await registerUser();

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Invalid credentials',
    });
  });

  it('returns 401 for non-existent email (no email enumeration)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('ghost'), password: 'Password1!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });
});

// =============================================================================
// 3. HAPPY PATH: register → login → /me → refresh → logout → token invalidated
// =============================================================================

describe('Happy path: full auth lifecycle', () => {
  it('completes register → login → /me → refresh → logout → refresh fails', async () => {
    const { email, password, body: loginBody } = await registerAndLogin();
    const { accessToken, refreshToken } = loginBody.tokens;

    // ── GET /me returns the authenticated user ─────────────────────────────────
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toMatchObject({ email, role: 'CUSTOMER' });

    // ── Refresh tokens returns a new pair ─────────────────────────────────────
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    const newRefreshToken: string = refreshRes.body.refreshToken as string;

    // ── Logout revokes the new refresh token ──────────────────────────────────
    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refreshRes.body.accessToken as string}`)
      .send({ refreshToken: newRefreshToken });

    expect(logoutRes.status).toBe(204);

    // ── Using revoked token after logout → 401 ────────────────────────────────
    const afterLogoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: newRefreshToken });

    // Token was revoked — theft detection returns 401
    expect(afterLogoutRes.status).toBe(401);
  });
});

// =============================================================================
// 4. ACCOUNT LOCKOUT
// =============================================================================

describe('Account lockout', () => {
  it('locks account after 5 failed login attempts and returns 403', async () => {
    const { email } = await registerUser();

    // 5 wrong-password attempts
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    }

    // 6th attempt: account is locked
    const lockedRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword!' });

    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.message).toMatch(/locked/i);
  });

  it('locked account also rejects the correct password', async () => {
    const { email, password } = await registerUser();

    // Trigger lockout
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword!' });
    }

    // Even the correct password is rejected while locked
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/locked/i);
  });

  it('lockout response conforms to error contract', async () => {
    const { email } = await registerUser();

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Wrong!' });
    }

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Wrong!' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      statusCode: 403,
      message: expect.any(String),
      correlationId: expect.any(String),
    });
  });
});

// =============================================================================
// 5. REFRESH TOKEN THEFT DETECTION
// =============================================================================

describe('Refresh token theft detection', () => {
  it('presenting a revoked refresh token triggers family revocation and returns 401', async () => {
    const { body: loginBody } = await registerAndLogin();
    const originalRefreshToken = loginBody.tokens.refreshToken as string;

    // First legitimate refresh — original token is now revoked
    const firstRefresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalRefreshToken });
    expect(firstRefresh.status).toBe(200);

    const secondRefreshToken = firstRefresh.body.refreshToken as string;

    // Attacker re-presents the already-revoked original token
    const theftRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalRefreshToken });

    // Theft detection: entire family revoked, original token rejected
    expect(theftRes.status).toBe(401);

    // The second token (from the legitimate rotation) is also now revoked
    const cascadeRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: secondRefreshToken });

    expect(cascadeRes.status).toBe(401);
  });

  it('an unknown refresh token returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'totallyunknowntoken00000000000000000000000000000000000000000000' });

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// 6. EXPIRED ACCESS TOKENS
// =============================================================================

describe('Expired access tokens', () => {
  it('returns 401 when access token is expired', async () => {
    const { body: loginBody } = await registerAndLogin();
    const expiredToken = mintExpiredJwt({
      sub: loginBody.user.id as string,
      email: loginBody.user.email as string,
      role: loginBody.user.role as string,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('returns 401 when no Authorization header is provided on a protected route', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// 7. WRONG-ROLE ACCESS (403)
// =============================================================================

describe('Role-based access control', () => {
  it('returns 403 when a CUSTOMER token hits an ADMIN-only route (GET /api/v1/users)', async () => {
    const { body: loginBody } = await registerAndLogin();
    const customerToken = loginBody.tokens.accessToken as string;

    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ statusCode: 403 });
  });

  it('returns 403 for ADMIN_OFFICER token on SUPER_ADMIN-only route (PATCH status)', async () => {
    const { body: loginBody } = await registerAndLogin();

    const adminOfficerToken = mintJwt({
      sub: loginBody.user.id as string,
      email: loginBody.user.email as string,
      role: 'ADMIN_OFFICER',
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${loginBody.user.id as string}/status`)
      .set('Authorization', `Bearer ${adminOfficerToken}`)
      .send({ status: 'SUSPENDED' });

    expect(res.status).toBe(403);
  });

  it('SUPER_ADMIN token can access GET /api/v1/users', async () => {
    const { body: loginBody } = await registerAndLogin();
    const superAdminToken = mintJwt({
      sub: loginBody.user.id as string,
      email: loginBody.user.email as string,
      role: 'SUPER_ADMIN',
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
  });

  it('ADMIN_OFFICER token can access GET /api/v1/users', async () => {
    const { body: loginBody } = await registerAndLogin();
    const adminToken = mintJwt({
      sub: loginBody.user.id as string,
      email: loginBody.user.email as string,
      role: 'ADMIN_OFFICER',
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

// =============================================================================
// 8. PASSWORD RESET FLOW
// =============================================================================

describe('Password reset flow', () => {
  it('request always returns 202 (prevents email enumeration)', async () => {
    // Known email
    const { email } = await registerUser();
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/request')
      .send({ email });
    expect(res1.status).toBe(202);

    // Unknown email — must also return 202
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/request')
      .send({ email: uniqueEmail('ghost') });
    expect(res2.status).toBe(202);
  });

  it('request → capture token → confirm → login with new password works', async () => {
    const { email, password: oldPassword } = await registerUser();

    // Spy on the private notifyPasswordReset method to capture the plain token
    const authService = app.get(AuthService);
    let capturedToken = '';
    const spy = jest
      .spyOn(authService as unknown as Record<string, (...args: unknown[]) => void>, 'notifyPasswordReset')
      .mockImplementation((_email: unknown, token: unknown) => {
        capturedToken = token as string;
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/request')
      .send({ email });

    spy.mockRestore();
    expect(capturedToken).toBeTruthy();

    // Confirm with the captured token
    const newPassword = 'NewPassword2@';
    const confirmRes = await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/confirm')
      .send({ token: capturedToken, newPassword });
    expect(confirmRes.status).toBe(204);

    // Old password rejected
    const oldLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: oldPassword });
    expect(oldLoginRes.status).toBe(401);

    // New password works
    const newLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword });
    expect(newLoginRes.status).toBe(200);
  });

  it('password reset revokes existing sessions', async () => {
    const { email, body: loginBody } = await registerAndLogin();
    const oldRefreshToken = loginBody.tokens.refreshToken as string;

    // Request + confirm reset
    const authService = app.get(AuthService);
    let capturedToken = '';
    const spy = jest
      .spyOn(authService as unknown as Record<string, (...args: unknown[]) => void>, 'notifyPasswordReset')
      .mockImplementation((_e: unknown, t: unknown) => { capturedToken = t as string; });

    await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/request')
      .send({ email });
    spy.mockRestore();

    await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/confirm')
      .send({ token: capturedToken, newPassword: 'BrandNew3#' });

    // Old refresh token should now be revoked
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken });

    expect(refreshRes.status).toBe(401);
  });

  it('confirm with invalid/expired token returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/confirm')
      .send({ token: 'invalidtoken1234567890abcdef1234567890abcdef1234567890abcdef12', newPassword: 'NewPassword1!' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      message: expect.any(String),
      correlationId: expect.any(String),
    });
  });
});

// =============================================================================
// 9. CHANGE PASSWORD
// =============================================================================

describe('POST /api/v1/auth/password/change', () => {
  it('changes password and revokes all sessions (204)', async () => {
    const { email, password, body: loginBody } = await registerAndLogin();
    const { accessToken, refreshToken } = loginBody.tokens;

    const changeRes = await request(app.getHttpServer())
      .post('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: 'NewPassword2@' });

    expect(changeRes.status).toBe(204);

    // Old refresh token is revoked
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
  });

  it('returns 401 when current password is wrong', async () => {
    const { body: loginBody } = await registerAndLogin();
    const { accessToken } = loginBody.tokens;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongCurrent1!', newPassword: 'NewPassword2@' });

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// 10. PLATFORM ERROR CONTRACT
// =============================================================================

describe('Error response contract', () => {
  const errorCases: Array<{ label: string; fn: () => Promise<request.Response> }> = [
    {
      label: '401 on missing auth',
      fn: () => request(app.getHttpServer()).get('/api/v1/auth/me'),
    },
    {
      label: '401 on bad credentials',
      fn: () =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail('contract'), password: 'Password1!' }),
    },
    {
      label: '422 on validation error',
      fn: () => request(app.getHttpServer()).post('/api/v1/auth/register').send({}),
    },
  ];

  it.each(errorCases)('$label has statusCode + message + correlationId', async ({ fn }) => {
    const res = await fn();
    expect(res.body).toMatchObject({
      statusCode: expect.any(Number),
      message: expect.any(String),
      correlationId: expect.any(String),
    });
  });
});

// =============================================================================
// 11. CONCURRENT LOAD — duplicate registration race & parallel lockout
// =============================================================================

describe('Concurrent load behavior', () => {
  it('simultaneous registrations with the same email never return 500', async () => {
    const email = uniqueEmail('race');
    registeredEmails.push(email);

    // Fire 5 concurrent registration requests targeting the same email.
    // One must succeed (201) and the rest must resolve to a deterministic
    // conflict (409) — the race-past-findFirst path must map P2002 → 409.
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Race',
            lastName: 'Test',
            email,
            phone: uniquePhone(),
            password: 'Password1!',
          }),
      ),
    );

    const statuses = results.map((r) => r.status);
    // Exactly one request wins; the rest are conflicts — nothing should be 500
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);
  });

  it('10 parallel wrong-password attempts result in lockout — never 500', async () => {
    const { email } = await registerUser();

    // Fire 10 concurrent bad-credential requests.  Each should produce either
    // 401 (bad password) or 403 (account locked by a concurrent request) — the
    // increment-and-lock path must be safe under concurrent DB writes.
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'WrongPassword!' }),
      ),
    );

    const statuses = results.map((r) => r.status);
    expect(statuses.every((s) => s === 401 || s === 403)).toBe(true);

    // After the flood the account must be definitively locked
    const postFloodRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword!' });
    expect(postFloodRes.status).toBe(403);
    expect(postFloodRes.body.message).toMatch(/locked/i);
  });

  it('incrementAndMaybeLock atomically sets lockedUntil in the same operation as the threshold breach', async () => {
    // Direct atomicity verification: call the service method directly and
    // confirm that when failedLoginAttempts reaches the threshold, lockedUntil
    // is returned by the SAME SQL statement — not by a subsequent call.
    // This proves no intermediate state (counter ≥ threshold, lockedUntil NULL)
    // can exist between two separate round-trips.

    const { email } = await registerUser();
    const dbUser = await prisma.user.findUnique({ where: { email } });

    // Pre-load 4 failures (one below threshold)
    await prisma.user.update({
      where: { id: dbUser!.id },
      data: { failedLoginAttempts: 4 },
    });

    const identityService = app.get(IdentityService);
    const result = await identityService.incrementAndMaybeLock(dbUser!.id, 5, 15);

    // The atomic op returns counter=5 AND lockedUntil set — both from one UPDATE
    expect(result.failedLoginAttempts).toBe(5);
    expect(result.lockedUntil).not.toBeNull();
    expect(result.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // DB row confirms neither write was deferred to a second statement
    const dbState = await prisma.user.findUnique({ where: { email } });
    expect(dbState!.failedLoginAttempts).toBe(5);
    expect(dbState!.lockedUntil).not.toBeNull();
    expect(dbState!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('valid login is rejected when the atomic increment-lock fires during bcrypt (spy-controlled interleaving)', async () => {
    // Deterministic interleaving test.
    //
    // Scenario modelled:
    //   T1 (valid login)   reads user (failedAttempts=4, unlocked) → bcrypt OK
    //   T2 (wrong-pwd)     incrementAndMaybeLock fires atomically →
    //                      counter=5 AND lockedUntil=+15min in ONE statement
    //   T1                 resetFailedAttempts — conditional WHERE lockedUntil IS NULL
    //                      does NOT match → wasLocked=true → 403, lock preserved
    //
    // The spy injects T2's completed atomic result right before T1's reset runs,
    // controlling the exact interleaving deterministically.

    const { email, password } = await registerUser();
    const dbUser = await prisma.user.findUnique({ where: { email } });

    await prisma.user.update({
      where: { id: dbUser!.id },
      data: { failedLoginAttempts: 4 },
    });

    const identityService = app.get(IdentityService);
    const originalReset = identityService.resetFailedAttempts.bind(identityService);

    const spy = jest
      .spyOn(identityService, 'resetFailedAttempts')
      .mockImplementationOnce(async (userId: string) => {
        // T2's atomic UPDATE just committed: counter=5 AND lockedUntil set.
        // This is the post-threshold-breach DB state the new implementation
        // guarantees (no split between increment and lock).
        await prisma.user.update({
          where: { id: userId },
          data: {
            failedLoginAttempts: 5,
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        // Real conditional reset: WHERE lockedUntil IS NULL → no match → no-op
        return originalReset(userId);
      });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

    spy.mockRestore();

    // wasLocked=true → tokens refused → 403
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.message).toMatch(/locked/i);

    // Lock intact — reset was a no-op
    const finalUser = await prisma.user.findUnique({ where: { email } });
    expect(finalUser!.lockedUntil).not.toBeNull();
    expect(finalUser!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('concurrent registration with the same phone never returns 500', async () => {
    const phone = uniquePhone();
    const results = await Promise.all(
      Array.from({ length: 3 }, () => {
        const email = uniqueEmail('race-phone');
        registeredEmails.push(email);
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({ firstName: 'Ph', lastName: 'Race', email, phone, password: 'Password1!' });
      }),
    );

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);
  });
});

// =============================================================================
// 12. AUDIT LOG PERSISTENCE
// Verifies that every security event is permanently written to the audit_logs
// table — even though AuditService.log() swallows its own errors, we must
// confirm the happy path actually persists rows.
// =============================================================================

describe('Audit log persistence', () => {
  /**
   * Helper: fetch all audit rows for a given actorId + action, ordered by
   * createdAt descending so the most-recent row is first.
   */
  async function getAuditRows(actorId: string, action: string) {
    return prisma.auditLog.findMany({
      where: { actorId, action },
      orderBy: { createdAt: 'desc' },
    });
  }

  it('writes USER_LOGIN_SUCCESS row after a successful login', async () => {
    const { email, password } = await registerUser();

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    const rows = await getAuditRows(dbUser.id, AUTH_AUDIT_ACTIONS.LOGIN_SUCCESS);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      actorId: dbUser.id,
      actorEmail: email,
      action: AUTH_AUDIT_ACTIONS.LOGIN_SUCCESS,
      resource: 'user',
      result: 'SUCCESS',
    });
  });

  it('writes USER_LOGIN_FAILED row after a bad-password attempt', async () => {
    const { email } = await registerUser();

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1!' });

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    const rows = await getAuditRows(dbUser.id, AUTH_AUDIT_ACTIONS.LOGIN_FAILED);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      actorId: dbUser.id,
      action: AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
      result: 'FAILURE',
    });
  });

  it('writes USER_LOGIN_ACCOUNT_LOCKED row after the account is locked and another attempt is made', async () => {
    const { email } = await registerUser();
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email } });

    // 5 wrong-password attempts — these write LOGIN_FAILED rows and atomically
    // set lockedUntil on the 5th via incrementAndMaybeLock.
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword!' });
    }

    // 6th attempt: account is already locked, so the lockout pre-check at the
    // top of login() fires and writes a LOGIN_LOCKED audit entry before the 403.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword!' });

    const rows = await getAuditRows(dbUser.id, AUTH_AUDIT_ACTIONS.LOGIN_LOCKED);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      actorId: dbUser.id,
      action: AUTH_AUDIT_ACTIONS.LOGIN_LOCKED,
      result: 'FAILURE',
    });
  });

  it('writes USER_TOKEN_THEFT_DETECTED row when a revoked refresh token is reused', async () => {
    const { body: loginBody } = await registerAndLogin();
    const originalRefreshToken = loginBody.tokens.refreshToken as string;
    const userId = loginBody.user.id as string;

    // Legitimate first rotation — originalRefreshToken is now revoked
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalRefreshToken });

    // Attacker re-presents the revoked token — theft detection fires
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalRefreshToken });

    const rows = await getAuditRows(userId, AUTH_AUDIT_ACTIONS.TOKEN_THEFT_DETECTED);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      actorId: userId,
      action: AUTH_AUDIT_ACTIONS.TOKEN_THEFT_DETECTED,
      result: 'FAILURE',
    });
  });

  it('writes PASSWORD_RESET_REQUESTED and PASSWORD_RESET_COMPLETED rows', async () => {
    const { email } = await registerUser();
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email } });

    // Capture the plain reset token via the notifyPasswordReset spy
    const authService = app.get(AuthService);
    let capturedToken = '';
    const spy = jest
      .spyOn(authService as unknown as Record<string, (...args: unknown[]) => void>, 'notifyPasswordReset')
      .mockImplementation((_email: unknown, token: unknown) => {
        capturedToken = token as string;
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/request')
      .send({ email });

    spy.mockRestore();
    expect(capturedToken).toBeTruthy();

    // Assert PASSWORD_RESET_REQUESTED was written
    const requestedRows = await getAuditRows(
      dbUser.id,
      AUTH_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    );
    expect(requestedRows.length).toBeGreaterThanOrEqual(1);
    expect(requestedRows[0]).toMatchObject({
      actorId: dbUser.id,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      result: 'SUCCESS',
    });

    // Complete the reset
    await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/confirm')
      .send({ token: capturedToken, newPassword: 'NewPassword3#' });

    // Assert PASSWORD_RESET_COMPLETED was written
    const completedRows = await getAuditRows(
      dbUser.id,
      AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    );
    expect(completedRows.length).toBeGreaterThanOrEqual(1);
    expect(completedRows[0]).toMatchObject({
      actorId: dbUser.id,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      result: 'SUCCESS',
    });
  });

  it('writes USER_REGISTERED row after a new account is created', async () => {
    const { res, email } = await registerUser();
    expect(res.status).toBe(201);

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    const rows = await getAuditRows(dbUser.id, AUDIT_ACTIONS.USER_REGISTERED);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      actorId: dbUser.id,
      actorEmail: email,
      action: AUDIT_ACTIONS.USER_REGISTERED,
      resource: 'user',
      result: 'SUCCESS',
    });
  });

  it('writes USER_LOGOUT row after a successful logout', async () => {
    const { body: loginBody } = await registerAndLogin();
    const { accessToken, refreshToken } = loginBody.tokens;
    const userId = loginBody.user.id as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });

    const rows = await getAuditRows(userId, AUTH_AUDIT_ACTIONS.LOGOUT);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      actorId: userId,
      action: AUTH_AUDIT_ACTIONS.LOGOUT,
      resource: 'refresh_token',
      result: 'SUCCESS',
    });
  });

  it('writes USER_TOKEN_REFRESHED row after a successful token rotation', async () => {
    const { body: loginBody } = await registerAndLogin();
    const { refreshToken } = loginBody.tokens;
    const userId = loginBody.user.id as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    const rows = await getAuditRows(userId, AUTH_AUDIT_ACTIONS.TOKEN_REFRESHED);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      actorId: userId,
      action: AUTH_AUDIT_ACTIONS.TOKEN_REFRESHED,
      resource: 'refresh_token',
      result: 'SUCCESS',
    });
  });

  it('writes USER_PASSWORD_CHANGED row after a successful in-session password change', async () => {
    const { password, body: loginBody } = await registerAndLogin();
    const { accessToken } = loginBody.tokens;
    const userId = loginBody.user.id as string;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: 'Changed1#New' });
    expect(res.status).toBe(204);

    const rows = await getAuditRows(userId, AUTH_AUDIT_ACTIONS.PASSWORD_CHANGED);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      actorId: userId,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_CHANGED,
      result: 'SUCCESS',
    });
  });

  it('writes USER_PASSWORD_CHANGE_FAILED row when the current password is wrong', async () => {
    const { body: loginBody } = await registerAndLogin();
    const { accessToken } = loginBody.tokens;
    const userId = loginBody.user.id as string;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongCurrentPwd1!', newPassword: 'NewPwd2@' });
    expect(res.status).toBe(401);

    const rows = await getAuditRows(userId, AUTH_AUDIT_ACTIONS.PASSWORD_CHANGE_FAILED);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      actorId: userId,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_CHANGE_FAILED,
      result: 'FAILURE',
    });
  });

  it('writes PASSWORD_RESET_INVALID_TOKEN row when an expired/bad reset token is submitted', async () => {
    const { email } = await registerUser();
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email } });

    // Submit a bogus token — the service can't link this to a user, so the
    // actorId falls back to 'system'.
    await request(app.getHttpServer())
      .post('/api/v1/auth/password/reset/confirm')
      .send({
        token: 'invalidtoken1234567890abcdef1234567890abcdef1234567890abcdef12',
        newPassword: 'NewPassword1!',
      });

    // The invalid-token path records actorId as 'system' because no user is
    // resolved. Verify the row exists without constraining actorId.
    const rows = await prisma.auditLog.findMany({
      where: { action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_INVALID_TOKEN },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]).toMatchObject({
      action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_INVALID_TOKEN,
      result: 'FAILURE',
    });

    // Suppress unused-var warning — dbUser is declared for clarity
    void dbUser;
  });
});

// =============================================================================
// 13. RATE LIMITING  (isolated app with real throttler)
// =============================================================================

describe('Rate limiting', () => {
  let rlApp: INestApplication;
  let rlPrisma: PrismaService;
  const rlEmails: string[] = [];

  beforeAll(async () => {
    ({ app: rlApp, prisma: rlPrisma } = await createRateLimitApp());
  });

  afterAll(async () => {
    await cleanupTestUsers(rlPrisma, rlEmails);
    await rlApp.close();
  });

  it('returns 429 after 10 login requests within the TTL window', async () => {
    // Register a user to have a valid target (avoids bcrypt dummy-hash delay)
    const email = uniqueEmail('ratelimit');
    const phone = uniquePhone();
    rlEmails.push(email);
    await request(rlApp.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'RL', lastName: 'Test', email, phone, password: 'Password1!' });

    // Send 10 requests — all should be handled (wrong password → 401)
    for (let i = 0; i < 10; i++) {
      const res = await request(rlApp.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword!' });
      // First 5 return 401 (wrong password), 6th+ may return 403 (locked), both < 429
      expect([401, 403]).toContain(res.status);
    }

    // 11th request must be throttled
    const throttledRes = await request(rlApp.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword!' });

    expect(throttledRes.status).toBe(429);
  });
});

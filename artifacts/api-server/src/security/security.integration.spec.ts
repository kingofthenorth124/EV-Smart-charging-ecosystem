/**
 * Security Regression Tests
 *
 * Automated equivalent of docs/security/security-smoke-test-runbook.md.
 *
 * Covers:
 *  - Helmet security headers present on every response
 *  - X-Correlation-ID echoed on every response (client-supplied and generated)
 *  - Error responses (401, 404, 422, 409) never leak stack, passwordHash, or
 *    Prisma internals
 *  - 409 returned (not 500) for duplicate email/phone on POST /api/v1/auth/register
 *  - Validation failures return 422 with a structured `details` array
 */
import type { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createApp } from '../test/test-app.factory';
import { cleanupTestUsers, uniqueEmail, uniquePhone } from '../test/db-cleaner';
import { PrismaService } from '../modules/database/prisma.service';

// ─── Sensitive field patterns that must never appear in any error response ────
const SENSITIVE_PATTERNS = [
  /stack/i,
  /passwordHash/i,
  /prisma/i,
  /PrismaClient/i,
  /at Object\./i,
  /at async /i,
  /node_modules/i,
  /\.ts:\d/,
  /\.js:\d/,
];

function assertNoSensitiveData(body: unknown): void {
  const serialised = JSON.stringify(body);
  for (const pattern of SENSITIVE_PATTERNS) {
    expect(serialised).not.toMatch(pattern);
  }
}

// ─── Test state ───────────────────────────────────────────────────────────────

let app: INestApplication;
let prisma: PrismaService;
const registeredEmails: string[] = [];

beforeAll(async () => {
  ({ app, prisma } = await createApp());
});

afterAll(async () => {
  await cleanupTestUsers(prisma, registeredEmails);
  await app.close();
});

// =============================================================================
// 1. HELMET SECURITY HEADERS
// =============================================================================

describe('Helmet security headers', () => {
  const PROBED_ROUTES = [
    '/api/healthz',
    '/api/v1/auth/register', // non-GET endpoint — use HEAD/GET on a 404 fallback
  ];

  it('GET /api/healthz response includes Content-Security-Policy', async () => {
    const res = await request(app.getHttpServer()).get('/api/healthz');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('GET /api/healthz response includes X-Frame-Options', async () => {
    const res = await request(app.getHttpServer()).get('/api/healthz');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('GET /api/healthz response includes X-Content-Type-Options: nosniff', async () => {
    const res = await request(app.getHttpServer()).get('/api/healthz');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('error responses (404) also carry Helmet headers', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('error responses (401) also carry Helmet headers', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/users');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('POST error responses (422) also carry Helmet headers', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({});
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

// =============================================================================
// 2. X-CORRELATION-ID ROUND-TRIP
// =============================================================================

describe('X-Correlation-ID round-trip', () => {
  it('server generates a correlation ID when none is supplied', async () => {
    const res = await request(app.getHttpServer()).get('/api/healthz');
    expect(res.headers['x-correlation-id']).toBeDefined();
    expect(typeof res.headers['x-correlation-id']).toBe('string');
    expect(res.headers['x-correlation-id'].length).toBeGreaterThan(0);
  });

  it('server echoes the client-supplied X-Correlation-ID', async () => {
    const clientId = 'smoke-test-abc123';
    const res = await request(app.getHttpServer())
      .get('/api/healthz')
      .set('X-Correlation-ID', clientId);
    expect(res.headers['x-correlation-id']).toBe(clientId);
  });

  it('error response (401) includes X-Correlation-ID', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('error response (404) includes X-Correlation-ID', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('error response (422) includes X-Correlation-ID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'bad' });
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('X-Correlation-ID is echoed in the response body (correlationId field)', async () => {
    const clientId = 'body-echo-test-xyz';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Correlation-ID', clientId)
      .send({});
    expect(res.body.correlationId).toBe(clientId);
  });
});

// =============================================================================
// 3. ERROR RESPONSES CONTAIN NO SENSITIVE DATA
// =============================================================================

describe('Error responses contain no sensitive data', () => {
  it('404 response body has no stack traces or Prisma internals', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    assertNoSensitiveData(res.body);
    expect(res.body).not.toHaveProperty('stack');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('401 response body (unauthenticated) has no sensitive data', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/users');
    expect(res.status).toBe(401);
    assertNoSensitiveData(res.body);
    expect(res.body).not.toHaveProperty('stack');
  });

  it('401 response body (bad credentials) has no sensitive data', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('ghost'), password: 'Password1!' });
    expect(res.status).toBe(401);
    assertNoSensitiveData(res.body);
    expect(res.body).not.toHaveProperty('stack');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('422 response body (validation failure) has no sensitive data', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(422);
    assertNoSensitiveData(res.body);
    expect(res.body).not.toHaveProperty('stack');
  });

  it('409 response body (duplicate email) has no sensitive data', async () => {
    const email = uniqueEmail('dup-sec');
    const phone = uniquePhone();
    registeredEmails.push(email);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'Sec', lastName: 'Test', email, phone, password: 'Password1!' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'Sec', lastName: 'Test', email, phone: uniquePhone(), password: 'Password1!' });

    expect(res.status).toBe(409);
    assertNoSensitiveData(res.body);
    expect(res.body).not.toHaveProperty('stack');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('error responses conform to the platform contract (statusCode + message + correlationId)', async () => {
    const cases = [
      request(app.getHttpServer()).get('/api/v1/does-not-exist'),
      request(app.getHttpServer()).get('/api/v1/users'),
      request(app.getHttpServer()).post('/api/v1/auth/register').send({}),
    ];

    const results = await Promise.all(cases);
    for (const res of results) {
      expect(res.body).toMatchObject({
        statusCode: expect.any(Number),
        message: expect.any(String),
        correlationId: expect.any(String),
      });
    }
  });
});

// =============================================================================
// 4. DUPLICATE EMAIL / PHONE → 409 (not 500)
// =============================================================================

describe('Duplicate registration returns 409, never 500', () => {
  it('duplicate email → 409 with platform error body', async () => {
    const email = uniqueEmail('dup-email');
    registeredEmails.push(email);

    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'Dup', lastName: 'Email', email, phone: uniquePhone(), password: 'Password1!' });
    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'Dup', lastName: 'Email', email, phone: uniquePhone(), password: 'Password1!' });

    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({
      statusCode: 409,
      message: expect.any(String),
      correlationId: expect.any(String),
    });
    assertNoSensitiveData(second.body);
  });

  it('duplicate phone → 409 with platform error body', async () => {
    const phone = uniquePhone();
    const email1 = uniqueEmail('dup-phone-1');
    const email2 = uniqueEmail('dup-phone-2');
    registeredEmails.push(email1, email2);

    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'Dup', lastName: 'Phone', email: email1, phone, password: 'Password1!' });
    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ firstName: 'Dup', lastName: 'Phone', email: email2, phone, password: 'Password1!' });

    expect(second.status).toBe(409);
    expect(second.body.statusCode).toBe(409);
    assertNoSensitiveData(second.body);
  });
});

// =============================================================================
// 5. VALIDATION FAILURES → 422 WITH STRUCTURED details ARRAY
// =============================================================================

describe('Validation failures return 422 with structured details', () => {
  it('missing all fields → 422 with non-empty details array', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      statusCode: 422,
      message: 'Validation failed',
      correlationId: expect.any(String),
    });
    expect(Array.isArray(res.body.details)).toBe(true);
    expect((res.body.details as unknown[]).length).toBeGreaterThan(0);
  });

  it('each details entry has field and message properties', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'x' });

    expect(res.status).toBe(422);
    const details = res.body.details as Array<{ field: string; message: string }>;
    expect(Array.isArray(details)).toBe(true);
    expect(details.length).toBeGreaterThan(0);

    for (const entry of details) {
      expect(typeof entry.field).toBe('string');
      expect(typeof entry.message).toBe('string');
      expect(entry.field.length).toBeGreaterThan(0);
      expect(entry.message.length).toBeGreaterThan(0);
    }
  });

  it('details array contains no sensitive data', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'bad', password: 'weak' });

    expect(res.status).toBe(422);
    assertNoSensitiveData(res.body);
  });

  it('invalid login payload → 422 with details array', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'notanemail' }); // missing password

    expect(res.status).toBe(422);
    expect(Array.isArray(res.body.details)).toBe(true);
  });
});

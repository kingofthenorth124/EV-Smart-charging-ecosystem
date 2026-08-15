#!/usr/bin/env node
/**
 * Module 1 Acceptance Check
 * Run: node scripts/acceptance-check.cjs
 *
 * Exercises every Module 1 acceptance criterion against the live server.
 * Requires: DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD env vars.
 */
'use strict';

const http = require('http');

const BASE = 'http://localhost:8080/api';
const TS = Date.now();
const EMAIL = `acceptance.${TS}@camel.test`;
const PHONE = `+2348090${String(TS).slice(-6)}`;
const PASS  = 'AcceptPass123!';

let passed = 0;
let failed = 0;

function ok(label, detail = '')  { passed++; console.log(`  ✅ ${label}${detail ? '  (' + detail + ')' : ''}`); }
function bad(label, detail = '') { failed++; console.log(`  ❌ ${label}${detail ? '  ← ' + detail : ''}`); }
function section(title) { console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`); }

async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 8080,
      path: `/api${path}`, method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const rq = http.request(opts, (rs) => {
      const chunks = [];
      rs.on('data', c => chunks.push(c));
      rs.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        try { resolve({ status: rs.statusCode, body: JSON.parse(text) }); }
        catch { resolve({ status: rs.statusCode, body: text }); }
      });
    });
    rq.on('error', reject);
    if (payload) rq.write(payload);
    rq.end();
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     MODULE 1 ACCEPTANCE CHECK                ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Test account: ${EMAIL}`);

  // ── 1. Health ──────────────────────────────────────────────────────────────
  section('1. Health');
  const h = await req('GET', '/healthz');
  h.body?.status === 'ok' ? ok('/healthz → ok') : bad('/healthz', JSON.stringify(h.body));

  // ── 2. Self-registration ───────────────────────────────────────────────────
  section('2. Self-registration');
  const reg = await req('POST', '/v1/auth/register', {
    firstName: 'Acceptance', lastName: 'Test',
    email: EMAIL, phone: PHONE, password: PASS,
  });
  reg.status === 201         ? ok('HTTP 201 Created')          : bad('Expected 201', `got ${reg.status}`);
  reg.body?.role === 'CUSTOMER' ? ok('role = CUSTOMER')       : bad('role', reg.body?.role);
  reg.body?.status === 'PENDING' ? ok('status = PENDING')     : bad('status', reg.body?.status);
  const testUserId = reg.body?.id;

  // ── 3. Login + token pair ──────────────────────────────────────────────────
  section('3. Login → token pair');
  const login = await req('POST', '/v1/auth/login', { email: EMAIL, password: PASS });
  login.status === 200 ? ok('HTTP 200') : bad('Expected 200', `got ${login.status}`);
  const access  = login.body?.tokens?.accessToken;
  const refresh = login.body?.tokens?.refreshToken;
  access  ? ok('accessToken issued')  : bad('accessToken missing');
  refresh ? ok('refreshToken issued') : bad('refreshToken missing');

  // ── 4. GET /me ─────────────────────────────────────────────────────────────
  section('4. GET /me (authenticated self)');
  const me = await req('GET', '/v1/auth/me', null, access);
  me.body?.email === EMAIL ? ok('returns own profile') : bad('email mismatch', me.body?.email);

  // ── 5. Refresh token rotation ──────────────────────────────────────────────
  section('5. Refresh token rotation');
  const rot = await req('POST', '/v1/auth/refresh', { refreshToken: refresh });
  const access2  = rot.body?.accessToken;
  const refresh2 = rot.body?.refreshToken;
  access2  ? ok('new accessToken') : bad('no new accessToken', JSON.stringify(rot.body));
  refresh2 ? ok('new refreshToken (rotated)') : bad('no new refreshToken');

  // ── 6. Theft detection ─────────────────────────────────────────────────────
  section('6. Theft detection (reuse old token)');
  const theft1 = await req('POST', '/v1/auth/refresh', { refreshToken: refresh });
  theft1.status === 401 ? ok('old token rejected (401)') : bad('old token accepted', `status ${theft1.status}`);
  // New token from rotation must also be revoked (family revoked)
  const theft2 = await req('POST', '/v1/auth/refresh', { refreshToken: refresh2 });
  theft2.status === 401 ? ok('entire family revoked (401)') : bad('new token still valid after theft', `status ${theft2.status}`);

  // ── 7. Account lockout ─────────────────────────────────────────────────────
  section('7. Account lockout (5 wrong → 15-min lock)');
  for (let i = 0; i < 5; i++) {
    await req('POST', '/v1/auth/login', { email: EMAIL, password: 'WrongPass999!' });
  }
  const locked = await req('POST', '/v1/auth/login', { email: EMAIL, password: PASS });
  locked.status === 403 ? ok('6th attempt (correct pw) → 403 Forbidden') : bad('expected 403', `got ${locked.status} — ${locked.body?.message}`);
  const lockedMsg = String(locked.body?.message ?? '');
  lockedMsg.toLowerCase().includes('locked') ? ok(`lock message: "${lockedMsg}"`) : bad('message missing "locked"', lockedMsg);

  // ── 8. RBAC ────────────────────────────────────────────────────────────────
  section('8. RBAC');
  const noTok = await req('GET', '/v1/users');
  noTok.status === 401 ? ok('no token → 401 Unauthorized') : bad('expected 401', `got ${noTok.status}`);

  // Admin login
  const adminLogin = await req('POST', '/v1/auth/login', {
    email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
  });
  const adminTok = adminLogin.body?.tokens?.accessToken;
  adminTok ? ok('admin login OK') : bad('admin login failed', JSON.stringify(adminLogin.body));

  // Customer token (access from login above, before lockout — use admin to test CUSTOMER role)
  // Register a second user for RBAC test
  const rbacReg = await req('POST', '/v1/auth/register', {
    firstName: 'RBAC', lastName: 'Test',
    email: `rbac.${TS}@camel.test`, phone: `+2348091${String(TS).slice(-6)}`, password: PASS,
  });
  const rbacLogin = await req('POST', '/v1/auth/login', {
    email: `rbac.${TS}@camel.test`, password: PASS,
  });
  const custTok = rbacLogin.body?.tokens?.accessToken;
  const custForbidden = await req('GET', '/v1/users', null, custTok);
  custForbidden.status === 403 ? ok('CUSTOMER role → 403 Forbidden on admin route')
    : bad('expected 403', `got ${custForbidden.status} — ${custForbidden.body?.message}`);

  // ── 9. Admin: list users ───────────────────────────────────────────────────
  section('9. Admin: list & activate users');
  const list = await req('GET', '/v1/users?page=1&limit=10', null, adminTok);
  list.status === 200 && list.body?.total > 0
    ? ok(`list users → ${list.body.total} total, page ${list.body.page}`)
    : bad('list users failed', JSON.stringify(list.body));

  // Activate the locked test user
  const activate = await req('PATCH', `/v1/users/${testUserId}/status`, { status: 'ACTIVE' }, adminTok);
  activate.body?.status === 'ACTIVE' ? ok('admin activated PENDING user → ACTIVE')
    : bad('activation failed', JSON.stringify(activate.body));

  // ── 10. Password reset (dev flow) ──────────────────────────────────────────
  section('10. Password reset (dev — token logged to server)');
  const prReq = await req('POST', '/v1/auth/password/reset/request', { email: EMAIL });
  prReq.status === 202 ? ok('POST /password/reset/request → 202 Accepted')
    : bad('expected 202', `got ${prReq.status}`);
  const prMsg = String(prReq.body?.message ?? '');
  prMsg.length > 0 ? ok(`anti-enumeration message returned`)
    : bad('no message body');

  // Non-existent email should also return 202 (anti-enumeration)
  const prEnum = await req('POST', '/v1/auth/password/reset/request', { email: 'nobody@nowhere.test' });
  prEnum.status === 202 ? ok('non-existent email → 202 (anti-enumeration)') : bad('expected 202', `got ${prEnum.status}`);

  // ── 11. Logout + revocation ────────────────────────────────────────────────
  section('11. Logout + refresh revocation');
  // Re-login (account was activated in step 9, lockout cleared)
  const relogin = await req('POST', '/v1/auth/login', { email: EMAIL, password: PASS });
  const logoutAccess  = relogin.body?.tokens?.accessToken;
  const logoutRefresh = relogin.body?.tokens?.refreshToken;
  relogin.status === 200 ? ok('re-login after activation OK') : bad('re-login failed', relogin.body?.message);

  await req('POST', '/v1/auth/logout', { refreshToken: logoutRefresh }, logoutAccess);
  const afterLogout = await req('POST', '/v1/auth/refresh', { refreshToken: logoutRefresh });
  afterLogout.status === 401 ? ok('post-logout refresh → 401') : bad('token still valid after logout', `status ${afterLogout.status}`);

  // ── 12. Correlation ID header ──────────────────────────────────────────────
  section('12. Correlation ID echoed on every response');
  const cid = await new Promise((resolve) => {
    http.get('http://localhost:8080/api/healthz', (rs) => {
      rs.resume();
      resolve(rs.headers['x-correlation-id'] || '');
    });
  });
  cid ? ok(`X-Correlation-ID: ${cid}`) : bad('X-Correlation-ID header missing');

  // ── Result ─────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  PASSED: ${String(passed).padEnd(3)}  FAILED: ${String(failed).padEnd(3)}                      ║`);
  console.log('╚══════════════════════════════════════════════╝\n');
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error('Acceptance check crashed:', err.message); process.exit(1); });

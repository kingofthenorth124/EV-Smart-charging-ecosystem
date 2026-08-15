# Security Smoke Test Runbook

> Module 1 Phase 9 — Security Hardening & Audit Verification  
> Run against the local dev server (`pnpm --filter @workspace/api-server run dev`)

Set the base URL once before running any commands:

```bash
export BASE="http://localhost:${PORT:-8080}"
```

---

## 1. Helmet security headers

Verify that the core security headers added by Helmet are present on any response.

```bash
curl -sI "$BASE/api/healthz" | grep -iE \
  "content-security-policy|x-frame-options|x-content-type-options|referrer-policy"
```

**Expected:** All four headers present. Verified output:

```
Content-Security-Policy: default-src 'self';base-uri 'self';...
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

---

## 2. Correlation ID round-trip

Every response must echo back an `X-Correlation-ID` header.

```bash
# Server generates one when not supplied
curl -si "$BASE/api/healthz" | grep -i x-correlation-id

# Server echoes the client-supplied ID
curl -si -H "X-Correlation-ID: smoke-test-abc123" "$BASE/api/healthz" \
  | grep x-correlation-id
```

**Expected:** `x-correlation-id: smoke-test-abc123` in the second response.

---

## 3. Error responses contain no sensitive data

Trigger a 404 and an unauthenticated 401, and confirm no stack traces, password hashes, or internal details appear.

```bash
# 404 — non-existent route
curl -s "$BASE/api/v1/does-not-exist"

# 401 — protected route without token
curl -s "$BASE/api/v1/users"
```

**Expected body shape:**

```json
{ "statusCode": 404, "message": "...", "error": "Not Found" }
{ "statusCode": 401, "message": "Authentication token is required", "error": "Unauthorized" }
```

**Must NOT contain:** `stack`, `passwordHash`, `token`, `secret`, `sql`, Prisma internals, or
class names.

---

## 4. Validation errors (422) — field-level details, no internals

```bash
curl -s -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"x"}'
```

**Expected:**

- `statusCode: 422`
- `message: "Validation failed"`
- `details` array with `field` and `message` per constraint
- **No** `passwordHash`, stack trace, or Prisma error strings

---

## 5. Duplicate email/phone → 409 (not 500)

```bash
# Register a user
curl -s -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Test","lastName":"User",
    "email":"dup@example.com","phone":"+1234567890",
    "password":"SecurePass1!"
  }'

# Re-register with same email — must be 409
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Test","lastName":"User",
    "email":"dup@example.com","phone":"+1999999999",
    "password":"SecurePass1!"
  }'
```

**Expected:** `409` on the second request.

---

## 6. Rate limiting → 429 with Retry-After

The login endpoint allows 10 requests per 15-minute window per IP. Trigger the limit with a loop:

```bash
for i in $(seq 1 12); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"nobody@example.com","password":"wrong"}')
  echo "Request $i: $STATUS"
done
```

**Expected:** First 10 return `401`. Request 11+ returns `429`. Confirm `Retry-After` header:

```bash
curl -si -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com","password":"wrong"}' \
  | grep -iE "HTTP/|retry-after|x-correlation-id"
```

---

## 7. Audit log rows in the database

After running the tests above, confirm rows were written to `audit_logs`. Connect to the dev
database and run:

```sql
SELECT action, result, actor_email, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

**Expected event types:**

| Action            | Trigger                            |
| ----------------- | ---------------------------------- |
| `USER_REGISTERED` | Successful registration            |
| `LOGIN_FAILED`    | Incorrect password                 |
| `LOGIN_LOCKED`    | Login attempt while account locked |

---

## 8. No secrets in logs

Pino is configured to redact `req.headers.authorization` and `req.headers.cookie`
(see `app.module.ts` → `LoggerModule.forRootAsync` → `pinoHttp.redact`).

To verify, make an authenticated request and search the server's stdout for the raw token:

```bash
# Capture a login response to get a real token
TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"your@user.com","password":"YourPass1!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))")

# Make an authenticated call — inspect the running server terminal
# and confirm the Authorization header appears as [Redacted], not as "Bearer $TOKEN"
curl -si -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/users" > /dev/null
```

In the server's pino-pretty output, the request log line must show
`"authorization":"[Redacted]"`, not the raw token value.

---

## Results — verified 2026-08-15

| Check                                 | Result  |
| ------------------------------------- | ------- |
| Helmet headers on every response      | ✅ PASS |
| X-Correlation-ID echoed               | ✅ PASS |
| 404/401 contain no internals          | ✅ PASS |
| Validation → 422 with `details` array | ✅ PASS |
| Duplicate email → 409                 | ✅ PASS |
| CVE audit — 0 runtime findings        | ✅ PASS |

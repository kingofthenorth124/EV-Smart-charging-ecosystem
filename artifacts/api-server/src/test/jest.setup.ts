/**
 * Jest global setup — runs before each test file.
 * Sets environment variables required by AppModule's config validator.
 * DATABASE_URL is expected to be set in the real environment (Replit secret).
 */
process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-chars!!";
process.env.NODE_ENV = "test";
process.env.BCRYPT_ROUNDS = "4"; // fast hashing in tests
process.env.LOG_LEVEL = "silent"; // suppress pino output during tests
process.env.ACCOUNT_LOCKOUT_ATTEMPTS = "5";
process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES = "15";
process.env.PASSWORD_RESET_EXPIRES_MINUTES = "60";

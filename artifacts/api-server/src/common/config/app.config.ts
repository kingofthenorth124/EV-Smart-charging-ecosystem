/**
 * Application configuration factory and environment validation.
 *
 * All environment variables used by the application are declared here.
 * The `validate` function runs at startup — missing required variables
 * cause the process to exit immediately (fail-fast principle).
 */

export function validate(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];

  if (!config['DATABASE_URL']) {
    errors.push('DATABASE_URL is required');
  }

  if (!config['JWT_SECRET']) {
    errors.push('JWT_SECRET is required');
  } else if (typeof config['JWT_SECRET'] === 'string' && config['JWT_SECRET'].length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (errors.length > 0) {
    throw new Error(
      `\n\n⛔ Configuration validation failed:\n  - ${errors.join('\n  - ')}\n\n` +
        'Set the required environment variables and restart the application.\n',
    );
  }

  return config;
}

export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: (process.env.NODE_ENV ?? 'development') as 'development' | 'test' | 'production',
  corsOrigin: process.env.CORS_ORIGIN ?? '',

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    /** Access token TTL in seconds, for the expiresIn response field */
    accessTtlSeconds: parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? '900', 10),
  },

  logging: {
    level: (process.env.LOG_LEVEL ?? 'info') as string,
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
    lockoutAttempts: parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS ?? '5', 10),
    lockoutDurationMinutes: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES ?? '15', 10),
    passwordResetExpiresMinutes: parseInt(
      process.env.PASSWORD_RESET_EXPIRES_MINUTES ?? '60',
      10,
    ),
  },

  rateLimit: {
    globalTtlMs: parseInt(process.env.RATE_LIMIT_TTL_MS ?? '60000', 10),
    globalMax: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    authTtlMs: parseInt(process.env.AUTH_RATE_LIMIT_TTL_MS ?? '900000', 10), // 15 min
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '10', 10),
  },

  email: {
    /** Resend API key — required in production, optional in development */
    resendApiKey: process.env.RESEND_API_KEY,
    /** From address shown in password-reset emails */
    fromAddress: process.env.EMAIL_FROM ?? 'noreply@camel-wallet.app',
    /** Base URL for the frontend reset-password page */
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  },
});

export type AppConfiguration = ReturnType<typeof configuration>;

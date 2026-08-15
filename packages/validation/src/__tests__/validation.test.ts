import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  phoneSchema,
  nameSchema,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  updateUserStatusSchema,
  topUpSchema,
  startSessionSchema,
  paginationSchema,
} from '../index';

describe('emailSchema', () => {
  it('accepts a valid email', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
  });

  it('lowercases the email', () => {
    const result = emailSchema.safeParse('User@Example.COM');
    expect(result.success && result.data).toBe('user@example.com');
  });

  it('rejects an invalid email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts a valid password', () => {
    expect(passwordSchema.safeParse('SecurePass1!').success).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(passwordSchema.safeParse('abc123').success).toBe(false);
  });

  it('rejects passwords longer than 128 characters', () => {
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts a Nigerian phone number', () => {
    expect(phoneSchema.safeParse('+2348012345678').success).toBe(true);
  });

  it('accepts a number without country code', () => {
    expect(phoneSchema.safeParse('08012345678').success).toBe(true);
  });

  it('rejects a number that is too short', () => {
    expect(phoneSchema.safeParse('123').success).toBe(false);
  });
});

describe('nameSchema', () => {
  it('accepts a valid name', () => {
    expect(nameSchema.safeParse('Adeola').success).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(nameSchema.safeParse('').success).toBe(false);
  });

  it('rejects a name over 100 characters', () => {
    expect(nameSchema.safeParse('a'.repeat(101)).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    firstName: 'Adeola',
    lastName: 'Johnson',
    email: 'adeola@example.com',
    phone: '+2348012345678',
    password: 'SecurePass1!',
  };

  it('accepts valid registration data', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { email: _email, ...without } = valid;
    expect(registerSchema.safeParse(without).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('rejects when new password matches current', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'SamePass1!',
      newPassword: 'SamePass1!',
    });
    expect(result.success).toBe(false);
  });

  it('accepts when passwords differ', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass123!',
      }).success,
    ).toBe(true);
  });
});

describe('passwordResetRequestSchema', () => {
  it('accepts a valid email', () => {
    expect(passwordResetRequestSchema.safeParse({ email: 'u@e.com' }).success).toBe(true);
  });
});

describe('passwordResetConfirmSchema', () => {
  it('accepts a token and new password', () => {
    expect(
      passwordResetConfirmSchema.safeParse({ token: 'abc123', newPassword: 'NewPass1!' }).success,
    ).toBe(true);
  });
});

describe('updateUserStatusSchema', () => {
  it('accepts valid status values', () => {
    for (const status of ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const) {
      expect(updateUserStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects an invalid status', () => {
    expect(updateUserStatusSchema.safeParse({ status: 'DELETED' }).success).toBe(false);
  });
});

describe('topUpSchema', () => {
  it('accepts a valid top-up request', () => {
    expect(
      topUpSchema.safeParse({
        amountKobo: 50_000,
        method: 'CARD',
        idempotencyKey: 'key-123',
      }).success,
    ).toBe(true);
  });

  it('rejects amounts below the minimum (₦100 = 10,000 kobo)', () => {
    expect(
      topUpSchema.safeParse({
        amountKobo: 9_999,
        method: 'CARD',
        idempotencyKey: 'key-123',
      }).success,
    ).toBe(false);
  });

  it('rejects amounts above the maximum', () => {
    expect(
      topUpSchema.safeParse({
        amountKobo: 50_000_001,
        method: 'CARD',
        idempotencyKey: 'key-123',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid payment methods', () => {
    expect(
      topUpSchema.safeParse({
        amountKobo: 50_000,
        method: 'CRYPTO',
        idempotencyKey: 'key-123',
      }).success,
    ).toBe(false);
  });
});

describe('startSessionSchema', () => {
  it('accepts a valid session start request', () => {
    expect(startSessionSchema.safeParse({ stationId: 'station-1' }).success).toBe(true);
  });

  it('accepts an optional spend cap', () => {
    expect(
      startSessionSchema.safeParse({ stationId: 'station-1', limitKobo: 5_000 }).success,
    ).toBe(true);
  });

  it('rejects a spend cap below the minimum', () => {
    expect(
      startSessionSchema.safeParse({ stationId: 'station-1', limitKobo: 999 }).success,
    ).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('applies defaults when no params given', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success && result.data).toEqual({ page: 1, limit: 20 });
  });

  it('rejects a limit above 100', () => {
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('coerces string numbers', () => {
    const result = paginationSchema.safeParse({ page: '2', limit: '50' });
    expect(result.success && result.data).toEqual({ page: 2, limit: 50 });
  });
});

/**
 * @workspace/validation — Shared Zod validation schemas
 *
 * Frontend: immediate user feedback.
 * Backend: authoritative enforcement via class-validator DTOs.
 *
 * Rules:
 * - Backend validation is always authoritative.
 * - Frontend validation provides UX feedback only — never a security boundary.
 * - Schemas here mirror backend DTOs but do not replace them.
 * - Import from 'zod/v4' to avoid Zod v3/v4 hoisting conflicts.
 */
import { z } from 'zod/v4';

// ─── Primitive schemas ────────────────────────────────────────────────────────

export const emailSchema = z
  .string({ error: 'Email is required' })
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .toLowerCase();

export const passwordSchema = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters');

export const phoneSchema = z
  .string({ error: 'Phone number is required' })
  .min(10, 'Enter a valid phone number')
  .max(20, 'Phone number is too long')
  .regex(/^\+?[0-9\s\-()]{10,20}$/, 'Enter a valid phone number');

export const nameSchema = z
  .string({ error: 'This field is required' })
  .min(1, 'This field is required')
  .max(100, 'Must not exceed 100 characters')
  .trim();

export const cuidSchema = z
  .string()
  .min(1, 'ID is required')
  .regex(/^c[a-z0-9]{24}$/, 'Invalid ID format');

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Auth schemas (Module 1) ──────────────────────────────────────────────────

export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ error: 'Refresh token is required' })
    .min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must differ from current password',
    path: ['newPassword'],
  });

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
  token: z
    .string({ error: 'Reset token is required' })
    .min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

// ─── Admin schemas (Module 1) ─────────────────────────────────────────────────

export const updateUserStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
});

// ─── Wallet schemas (Module 2) ────────────────────────────────────────────────

/** Minimum top-up: ₦100 = 10,000 kobo */
const MIN_TOPUP_KOBO = 10_000;
/** Maximum top-up: ₦500,000 = 50,000,000 kobo */
const MAX_TOPUP_KOBO = 50_000_000;

export const topUpSchema = z.object({
  amountKobo: z
    .number({ error: 'Amount is required' })
    .int('Amount must be a whole number of kobo')
    .min(MIN_TOPUP_KOBO, `Minimum top-up is ₦${MIN_TOPUP_KOBO / 100}`)
    .max(MAX_TOPUP_KOBO, `Maximum top-up is ₦${MAX_TOPUP_KOBO / 100}`),
  method: z.enum(['BANK_TRANSFER', 'CARD', 'USSD', 'SANDBOX']),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
});

export type TopUpInput = z.infer<typeof topUpSchema>;

// ─── Charging schemas (Module 2) ──────────────────────────────────────────────

/** Minimum session spend cap: ₦10 = 1,000 kobo */
const MIN_SESSION_LIMIT_KOBO = 1_000;

export const startSessionSchema = z.object({
  stationId: z.string().min(1, 'Station ID is required'),
  limitKobo: z
    .number()
    .int('Limit must be a whole number of kobo')
    .min(
      MIN_SESSION_LIMIT_KOBO,
      `Minimum spend cap is ₦${MIN_SESSION_LIMIT_KOBO / 100}`,
    )
    .optional(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;

// ─── Inferred types ───────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetConfirmInput = z.infer<
  typeof passwordResetConfirmSchema
>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

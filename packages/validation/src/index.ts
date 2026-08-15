/**
 * @workspace/validation — Module 1: Identity & Auth Validation Schemas
 *
 * Shared Zod validation schemas for Module 1 (Identity & Access Management).
 * Frontend: immediate user feedback.
 * Backend: authoritative enforcement via class-validator DTOs.
 *
 * Scope: Module 1 only. Future module schemas added when those modules
 * are implemented.
 */
import { z } from 'zod';

// ─── Primitive schemas ────────────────────────────────────────────────────────

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .toLowerCase();

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters');

export const phoneSchema = z
  .string({ required_error: 'Phone number is required' })
  .min(10, 'Enter a valid phone number')
  .max(20, 'Phone number is too long')
  .regex(/^\+?[0-9\s\-()]{10,20}$/, 'Enter a valid phone number');

export const nameSchema = z
  .string({ required_error: 'This field is required' })
  .min(1, 'This field is required')
  .max(100, 'Must not exceed 100 characters')
  .trim();

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
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
  token: z.string({ required_error: 'Reset token is required' }).min(1),
  newPassword: passwordSchema,
});

// ─── Admin schemas ─────────────────────────────────────────────────────────────

export const updateUserStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

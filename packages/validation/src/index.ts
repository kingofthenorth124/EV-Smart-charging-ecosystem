/**
 * @workspace/validation
 *
 * Shared Zod validation schemas.
 * Frontend: improves user experience (immediate feedback).
 * Backend: authoritative enforcement point.
 * Never rely on frontend validation alone for security or business rule enforcement.
 */
import { z } from 'zod';
import { MIN_TOP_UP_AMOUNT_KOBO } from '@workspace/config';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

export const phoneSchema = z
  .string()
  .min(10, 'Enter a valid phone number')
  .regex(/^\+?[0-9\s\-()]{10,15}$/, 'Enter a valid phone number');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registrationSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  vehicleMake: z.string().max(100).optional().nullable(),
  vehicleModel: z.string().max(100).optional().nullable(),
  vehicleLicensePlate: z.string().max(20).optional().nullable(),
});

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const topUpSchema = z.object({
  amountKobo: z
    .number()
    .int('Amount must be a whole number of kobo')
    .min(
      MIN_TOP_UP_AMOUNT_KOBO,
      `Minimum top-up amount is ₦${MIN_TOP_UP_AMOUNT_KOBO / 100}`,
    ),
  channel: z.enum(['CARD', 'BANK_TRANSFER', 'USSD', 'MOBILE_MONEY']),
});

// ─── NFC Card ─────────────────────────────────────────────────────────────────

export const nfcCardLinkSchema = z.object({
  cardIdentifier: z.string().min(1, 'Card identifier is required').max(100),
  label: z.string().max(100).optional().nullable(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type TopUpInput = z.infer<typeof topUpSchema>;
export type NfcCardLinkInput = z.infer<typeof nfcCardLinkSchema>;

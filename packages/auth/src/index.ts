/**
 * @workspace/auth
 *
 * Shared authentication and authorization contracts and helpers.
 * Implementation (JWT signing, bcrypt, guards) lives in the backend.
 * Frontend consumes these types and helpers to interact with auth correctly.
 *
 * Auth types that are shared platform-wide are re-exported from
 * @workspace/shared-types to keep a single authoritative source.
 */

// Re-export auth-related platform types — single source of truth
export type {
  UserRole,
  UserStatus,
  UserProfile,
  AuthTokens,
  LoginResponse,
  JwtPayload,
} from '@workspace/shared-types';

import type { UserRole, UserStatus } from '@workspace/shared-types';

// ─── Role registry ────────────────────────────────────────────────────────────

export const USER_ROLES: Record<UserRole, UserRole> = {
  CUSTOMER: 'CUSTOMER',
  ADMIN_OFFICER: 'ADMIN_OFFICER',
  SUPER_ADMIN: 'SUPER_ADMIN',
  OPERATIONS: 'OPERATIONS',
  SUPPORT: 'SUPPORT',
  FINANCE: 'FINANCE',
  TECHNICAL: 'TECHNICAL',
  DEVELOPER: 'DEVELOPER',
};

// ─── Auth context ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
}

// ─── Token storage keys ───────────────────────────────────────────────────────

/** localStorage key for the persisted refresh token. */
export const AUTH_TOKEN_KEY = 'camel_access_token' as const;
export const AUTH_REFRESH_TOKEN_KEY = 'camel_refresh_token' as const;

// ─── Permissions ──────────────────────────────────────────────────────────────

export type Permission =
  | 'wallet:read'
  | 'wallet:topup'
  | 'sessions:read'
  | 'sessions:authorize'
  | 'sessions:stop'
  | 'nfc:read'
  | 'nfc:manage'
  | 'stations:read'
  | 'admin:customers'
  | 'admin:stations'
  | 'admin:config'
  | 'developer:portal';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CUSTOMER: [
    'wallet:read',
    'wallet:topup',
    'sessions:read',
    'sessions:authorize',
    'sessions:stop',
    'nfc:read',
    'nfc:manage',
    'stations:read',
  ],
  ADMIN_OFFICER: [
    'wallet:read',
    'sessions:read',
    'nfc:read',
    'nfc:manage',
    'stations:read',
    'admin:customers',
  ],
  SUPER_ADMIN: [
    'wallet:read',
    'wallet:topup',
    'sessions:read',
    'sessions:authorize',
    'sessions:stop',
    'nfc:read',
    'nfc:manage',
    'stations:read',
    'admin:customers',
    'admin:stations',
    'admin:config',
    'developer:portal',
  ],
  OPERATIONS: ['sessions:read', 'stations:read', 'admin:stations'],
  SUPPORT: ['wallet:read', 'sessions:read', 'nfc:read', 'admin:customers'],
  FINANCE: ['wallet:read'],
  TECHNICAL: ['sessions:read', 'stations:read'],
  DEVELOPER: ['developer:portal'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN_OFFICER';
}

export function isCustomerRole(role: UserRole): boolean {
  return role === 'CUSTOMER';
}

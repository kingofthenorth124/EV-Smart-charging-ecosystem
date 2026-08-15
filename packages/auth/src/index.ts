/**
 * @workspace/auth
 *
 * Shared authentication and authorization interfaces.
 * Implementation lives in the backend domain.
 * Frontend uses these types to consume auth contracts correctly.
 */
import type { CustomerStatus } from '@workspace/shared-types';

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // Customer ID
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'CUSTOMER'
  | 'ADMIN_OFFICER'
  | 'SUPER_ADMIN'
  | 'OPERATIONS'
  | 'SUPPORT'
  | 'FINANCE'
  | 'TECHNICAL'
  | 'DEVELOPER';

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

// ─── Auth Context ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: CustomerStatus;
}

// ─── Token Storage ────────────────────────────────────────────────────────────

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

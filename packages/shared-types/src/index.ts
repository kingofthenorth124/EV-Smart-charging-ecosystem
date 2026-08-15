/**
 * @workspace/shared-types — Module 1: Identity & Access Management
 *
 * Authoritative shared contracts for identity, authentication, and system.
 * Consumed by both the NestJS backend (type safety) and React frontend (API contracts).
 *
 * Scope: Module 1 only. Future domain types (Wallet, Sessions, etc.) are
 * added when those modules are implemented.
 */

// ─── User / Identity ─────────────────────────────────────────────────────────

export type UserRole =
  | 'CUSTOMER'
  | 'ADMIN_OFFICER'
  | 'SUPER_ADMIN'
  | 'OPERATIONS'
  | 'SUPPORT'
  | 'FINANCE'
  | 'TECHNICAL'
  | 'DEVELOPER';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  registrationSource: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Authentication ───────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token TTL in seconds */
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

/** Shape of the decoded JWT access token payload */
export interface JwtPayload {
  sub: string;     // User ID
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  correlationId?: string;
  details?: ValidationErrorDetail[];
}

// ─── System / Health ─────────────────────────────────────────────────────────

export type HealthStatusValue = 'ok' | 'degraded' | 'down';

export interface HealthStatus {
  status: HealthStatusValue;
}

export interface SystemInfo {
  version: string;
  environment: string;
  timestamp: string;
  /** Process uptime in seconds */
  uptime: number;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export type AuditResult = 'SUCCESS' | 'FAILURE';

export const AUDIT_ACTIONS = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN_SUCCESS: 'USER_LOGIN_SUCCESS',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_TOKEN_REFRESHED: 'USER_TOKEN_REFRESHED',
  USER_TOKEN_REVOKED: 'USER_TOKEN_REVOKED',
  USER_PASSWORD_CHANGED: 'USER_PASSWORD_CHANGED',
  USER_PASSWORD_RESET_REQUESTED: 'USER_PASSWORD_RESET_REQUESTED',
  USER_PASSWORD_RESET_COMPLETED: 'USER_PASSWORD_RESET_COMPLETED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  USER_ACCOUNT_LOCKED: 'USER_ACCOUNT_LOCKED',
  ADMIN_USER_VIEWED: 'ADMIN_USER_VIEWED',
  ADMIN_USERS_LISTED: 'ADMIN_USERS_LISTED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

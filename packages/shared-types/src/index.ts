/**
 * @workspace/shared-types
 *
 * Authoritative shared contracts for the Camel Mobility Wallet platform.
 * Consumed by the NestJS backend (type safety) and React/Expo frontends (API contracts).
 *
 * Rules:
 * - Platform-neutral — no NestJS decorators, no Prisma models, no React hooks.
 * - Frontend-agnostic — no browser globals, no JSX.
 * - Add domain types when the corresponding module is implemented.
 */

// ─── User / Identity ─────────────────────────────────────────────────────────

export type UserRole =
  | "CUSTOMER"
  | "ADMIN_OFFICER"
  | "SUPER_ADMIN"
  | "OPERATIONS"
  | "SUPPORT"
  | "FINANCE"
  | "TECHNICAL"
  | "DEVELOPER";

export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

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
  tokenType: "Bearer";
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

/** Shape of the decoded JWT access token payload */
export interface JwtPayload {
  sub: string;
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

export interface PaginationQuery {
  page?: number;
  limit?: number;
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

export type HealthStatusValue = "ok" | "degraded" | "down";

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

export type AuditResult = "SUCCESS" | "FAILURE";

export const AUDIT_ACTIONS = {
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGIN_SUCCESS: "USER_LOGIN_SUCCESS",
  USER_LOGIN_FAILED: "USER_LOGIN_FAILED",
  USER_LOGOUT: "USER_LOGOUT",
  USER_TOKEN_REFRESHED: "USER_TOKEN_REFRESHED",
  USER_TOKEN_REVOKED: "USER_TOKEN_REVOKED",
  USER_PASSWORD_CHANGED: "USER_PASSWORD_CHANGED",
  USER_PASSWORD_RESET_REQUESTED: "USER_PASSWORD_RESET_REQUESTED",
  USER_PASSWORD_RESET_COMPLETED: "USER_PASSWORD_RESET_COMPLETED",
  USER_STATUS_CHANGED: "USER_STATUS_CHANGED",
  USER_ACCOUNT_LOCKED: "USER_ACCOUNT_LOCKED",
  ADMIN_USER_VIEWED: "ADMIN_USER_VIEWED",
  ADMIN_USERS_LISTED: "ADMIN_USERS_LISTED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ─── Wallet (Module 2) ────────────────────────────────────────────────────────

export type WalletStatus = "ACTIVE" | "SUSPENDED" | "FROZEN";

export type TransactionType = "TOP_UP" | "CHARGE" | "REFUND" | "ADJUSTMENT";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
export type TopUpMethod = "BANK_TRANSFER" | "CARD" | "USSD" | "SANDBOX";

export interface WalletSummary {
  id: string;
  userId: string;
  /** Balance in kobo (₦1 = 100 kobo) */
  balanceKobo: number;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  /** Amount in kobo — always positive */
  amountKobo: number;
  /** Balance after this transaction, in kobo */
  balanceAfterKobo: number;
  description: string;
  reference: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface TopUpRequest {
  /** Amount to credit, in kobo */
  amountKobo: number;
  method: TopUpMethod;
  /** Idempotency key — prevents duplicate credits */
  idempotencyKey: string;
}

export interface TopUpResponse {
  transaction: WalletTransaction;
  wallet: WalletSummary;
}

export interface DashboardSummary {
  wallet: WalletSummary;
  activeSession: ChargingSession | null;
  recentTransactions: WalletTransaction[];
}

// ─── Charging / Stations (Module 2) ──────────────────────────────────────────

export type StationStatus = "AVAILABLE" | "BUSY" | "OFFLINE" | "MAINTENANCE";
export type SessionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "FAILED";

export interface Station {
  id: string;
  name: string;
  location: string;
  /** Rated power output in kW */
  powerKw: number;
  connectorType: string;
  connectorsTotal: number;
  connectorsAvailable: number;
  /** Price per kWh in kobo */
  tariffKoboPerKwh: number;
  status: StationStatus;
}

export interface ChargingSession {
  id: string;
  userId: string;
  stationId: string;
  stationName: string;
  stationLocation: string;
  powerKw: number;
  tariffKoboPerKwh: number;
  status: SessionStatus;
  /** Energy delivered in watt-hours */
  energyWh: number;
  /** Total cost in kobo */
  costKobo: number;
  /** Optional spend cap in kobo */
  limitKobo: number | null;
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  startedAt: string;
  endedAt: string | null;
  stopReason: string | null;
}

export interface StartSessionRequest {
  stationId: string;
  /** Optional spend cap in kobo */
  limitKobo?: number;
}

// ─── Event envelope (Module 3) ───────────────────────────────────────────────

/**
 * Generic event envelope for platform domain events.
 * Decoupled from any specific broker (Kafka, SQS, etc.).
 */
export interface EventEnvelope<T = unknown> {
  /** Unique event ID (cuid/uuid) */
  id: string;
  /** Dot-separated event type, e.g. "wallet.topped_up" */
  type: string;
  /** Semantic version of this event schema, e.g. "1.0" */
  version: string;
  /** ISO-8601 timestamp of when the event occurred */
  occurredAt: string;
  /** Source service/module that emitted this event */
  source: string;
  /** Optional correlation ID for distributed tracing */
  correlationId?: string;
  /** Domain-specific event payload */
  payload: T;
}

/** Well-known platform event types */
export const PLATFORM_EVENTS = {
  // Wallet events
  WALLET_CREATED: "wallet.created",
  WALLET_TOPPED_UP: "wallet.topped_up",
  WALLET_CHARGED: "wallet.charged",
  WALLET_SUSPENDED: "wallet.suspended",
  // Session events
  SESSION_STARTED: "session.started",
  SESSION_STOPPED: "session.stopped",
  SESSION_LIMIT_REACHED: "session.limit_reached",
  SESSION_BALANCE_EXHAUSTED: "session.balance_exhausted",
  // Identity events
  USER_REGISTERED: "user.registered",
  USER_STATUS_CHANGED: "user.status_changed",
} as const;

export type PlatformEventType =
  (typeof PLATFORM_EVENTS)[keyof typeof PLATFORM_EVENTS];

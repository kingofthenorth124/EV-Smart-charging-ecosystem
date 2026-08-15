/**
 * @workspace/shared-types
 *
 * Authoritative domain type contracts shared between frontend and backend.
 * These types are derived from the OpenAPI specification and business rules.
 * Do not embed business logic here — types only.
 */

// ─── Enumerations ─────────────────────────────────────────────────────────────

export type CustomerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type NfcCardStatus =
  | 'UNASSIGNED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'LOST'
  | 'REPLACED'
  | 'REVOKED';

export type WalletStatus = 'ACTIVE' | 'SUSPENDED' | 'FROZEN';

export type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE' | 'REFUND';

export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export type PaymentChannel = 'CARD' | 'BANK_TRANSFER' | 'USSD' | 'MOBILE_MONEY';

export type PaymentStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'REVERSED'
  | 'REFUNDED';

export type ChargingSessionStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type StationStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';

export type ConnectorStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'UNAVAILABLE'
  | 'FAULTED';

export type ConnectorType =
  | 'TYPE_1'
  | 'TYPE_2'
  | 'CCS'
  | 'CHADEMO'
  | 'GB_T'
  | 'SCHUKO';

export type OcppProtocol = 'OCPP_16J' | 'OCPP_201';

// ─── Domain Entities ──────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleLicensePlate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  customerId: string;
  /** Balance available for use, in kobo (100 kobo = ₦1) */
  availableBalanceKobo: number;
  /** Balance reserved for active charging sessions */
  heldBalanceKobo: number;
  totalCreditedKobo: number;
  totalDebitedKobo: number;
  status: WalletStatus;
  currency: 'NGN';
  /** Minimum balance required to start a charging session */
  minimumBalanceKobo: number;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amountKobo: number;
  balanceAfterKobo: number;
  description: string;
  reference: string | null;
  sessionId: string | null;
  paymentId: string | null;
  status: WalletTransactionStatus;
  createdAt: string;
}

export interface NfcCard {
  id: string;
  customerId: string;
  cardIdentifier: string;
  label: string | null;
  status: NfcCardStatus;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface Connector {
  id: string;
  stationId: string;
  connectorId: number;
  type: ConnectorType;
  status: ConnectorStatus;
  powerKw: number;
  pricePerKwhKobo: number;
}

export interface ChargingStation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: StationStatus;
  connectors: Connector[];
  availableConnectors: number;
  totalConnectors: number;
  ocppProtocol: OcppProtocol;
  lastHeartbeatAt: string | null;
}

export interface ChargingSession {
  id: string;
  customerId: string;
  stationId: string;
  stationName: string | null;
  connectorId: number;
  nfcCardId: string | null;
  status: ChargingSessionStatus;
  startedAt: string;
  stoppedAt: string | null;
  energyDeliveredKwh: number | null;
  costKobo: number | null;
  pricePerKwhKobo: number | null;
  durationSeconds: number | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  walletBalance: number;
  totalSessions: number;
  totalEnergyKwh: number;
  totalSpentKobo: number;
  activeNfcCard: NfcCard | null;
  recentTransactions: WalletTransaction[];
  recentSessions: ChargingSession[];
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface TopUpInitiation {
  reference: string;
  authorizationUrl: string | null;
  ussdCode: string | null;
  accountNumber: string | null;
  bankName: string | null;
  status: 'PENDING' | 'PROCESSING';
  expiresAt: string | null;
}

export interface TopUpResult {
  reference: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  amountKobo: number;
  newBalanceKobo: number | null;
  message: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ─── Session Authorization ────────────────────────────────────────────────────

export interface SessionAuthorizationResult {
  authorized: boolean;
  sessionId: string | null;
  message: string;
  walletBalanceKobo: number | null;
  requiredBalanceKobo: number | null;
}

// ─── System ───────────────────────────────────────────────────────────────────

export interface SystemInfo {
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
}

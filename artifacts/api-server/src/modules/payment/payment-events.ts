/**
 * Canonical payment domain event names.
 * See docs/architecture.md, "Domain Events" for the platform-wide canonical list.
 */
export const PAYMENT_EVENTS = {
  PAYMENT_INITIATED: "payment.initiated",
  PAYMENT_COMPLETED: "payment.completed",
  PAYMENT_FAILED: "payment.failed",
  PAYMENT_REFUNDED: "payment.refunded",
} as const;

export interface PaymentInitiatedEvent {
  paymentId: string;
  userId: string;
  amountKobo: number;
  reference: string;
  correlationId?: string;
}

export interface PaymentCompletedEvent {
  paymentId: string;
  userId: string;
  amountKobo: number;
  reference: string;
  providerReference: string;
  correlationId?: string;
}

export interface PaymentRefundedEvent {
  paymentId: string;
  userId: string;
  amountKobo: number;
  refundReference: string;
  reason: string;
  correlationId?: string;
}


export enum PaymentState {
  CREATED = "CREATED",
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SUCCESS = "SUCCESS",
  SETTLED = "SETTLED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}

export class PaymentStateMachine {

  private static readonly transitions = {
    CREATED: ["PENDING", "CANCELLED"],
    PENDING: ["PROCESSING", "FAILED"],
    PROCESSING: ["SUCCESS", "FAILED"],
    SUCCESS: ["SETTLED", "REFUNDED"],
    SETTLED: ["REFUNDED"],
    FAILED: [],
    REFUNDED: [],
    CANCELLED: [],
  } as Record<PaymentState, PaymentState[]>;


  static canTransition(
    from: PaymentState,
    to: PaymentState
  ): boolean {
    return this.transitions[from].includes(to);
  }

}

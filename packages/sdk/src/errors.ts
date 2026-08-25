import type { ApiErrorResponse } from "@workspace/shared-types";

/**
 * Structured SDK error — wraps API error responses with typed access.
 * Thrown by all SDK methods when the server returns a non-2xx status.
 */
export class SdkError extends Error {
  /** HTTP status code */
  readonly statusCode: number;
  /** Machine-readable error code from the API */
  readonly error: string | undefined;
  /** Server-generated correlation ID for log tracing */
  readonly correlationId: string | undefined;
  /** Field-level validation errors, when available */
  readonly details: ApiErrorResponse["details"];
  /** Raw response body */
  readonly raw: ApiErrorResponse;

  constructor(response: ApiErrorResponse) {
    super(response.message);
    this.name = "SdkError";
    this.statusCode = response.statusCode;
    this.error = response.error;
    this.correlationId = response.correlationId;
    this.details = response.details;
    this.raw = response;
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isConflict(): boolean {
    return this.statusCode === 409;
  }

  get isValidationError(): boolean {
    return (
      this.statusCode === 422 ||
      (this.statusCode === 400 && !!this.details?.length)
    );
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }
}

/**
 * Narrow an unknown thrown value to SdkError.
 * Use in catch blocks: `if (isSdkError(e)) { ... }`
 */
export function isSdkError(error: unknown): error is SdkError {
  return error instanceof SdkError;
}

/**
 * Extract a user-friendly message from an unknown thrown value.
 * Falls back to a generic message when the error shape is unrecognised.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof SdkError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred. Please try again.";
}

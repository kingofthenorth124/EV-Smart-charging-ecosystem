/**
 * Backend-local auth type definitions.
 * Defined here to avoid ESM/CJS resolution issues with workspace packages.
 * The @workspace/shared-types package exports equivalent contracts for the frontend.
 */

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

/** Shape of the decoded JWT access token payload */
export interface JwtPayload {
  /** User ID (cuid) */
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** Augmented Express Request with authenticated user */
export interface AuthenticatedRequest extends Express.Request {
  user: JwtPayload;
  correlationId?: string;
}

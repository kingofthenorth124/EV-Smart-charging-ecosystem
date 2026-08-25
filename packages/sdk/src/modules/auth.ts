/**
 * SDK auth module — wraps the generated api-client-react auth endpoints
 * with typed error handling and a clean method surface.
 */
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  refreshTokens as apiRefresh,
  changePassword as apiChangePassword,
  requestPasswordReset as apiResetRequest,
  confirmPasswordReset as apiResetConfirm,
  getCurrentUser as apiGetCurrentUser,
} from "@workspace/api-client-react";
import type {
  LoginRequest,
  RegisterRequest,
  RefreshRequest,
  ChangePasswordRequest,
  PasswordResetRequestBody,
  PasswordResetConfirmBody,
} from "@workspace/api-client-react";
import type {
  LoginResponse,
  UserProfile,
  AuthTokens,
} from "@workspace/shared-types";
import { SdkError } from "../errors";

function wrapApiError(err: unknown): never {
  if (
    err !== null &&
    typeof err === "object" &&
    "status" in err &&
    "payload" in err
  ) {
    const e = err as {
      status: number;
      payload: {
        message?: string;
        error?: string;
        correlationId?: string;
        details?: unknown[];
      };
    };
    throw new SdkError({
      statusCode: e.status,
      message: e.payload?.message ?? "Request failed",
      error: e.payload?.error,
      correlationId: e.payload?.correlationId,
      details: e.payload
        ?.details as import("@workspace/shared-types").ValidationErrorDetail[],
    });
  }
  throw err;
}

export const authModule = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      return (await apiLogin(credentials)) as unknown as LoginResponse;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async register(data: RegisterRequest): Promise<UserProfile> {
    try {
      return (await apiRegister(data)) as unknown as UserProfile;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const body: RefreshRequest = { refreshToken };
    try {
      return (await apiRefresh(body)) as unknown as AuthTokens;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiLogout({ refreshToken });
    } catch (err) {
      wrapApiError(err);
    }
  },

  async getCurrentUser(): Promise<UserProfile> {
    try {
      return (await apiGetCurrentUser()) as unknown as UserProfile;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    try {
      await apiChangePassword(data);
    } catch (err) {
      wrapApiError(err);
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    const body: PasswordResetRequestBody = { email };
    try {
      await apiResetRequest(body);
    } catch (err) {
      wrapApiError(err);
    }
  },

  async confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<void> {
    const body: PasswordResetConfirmBody = { token, newPassword };
    try {
      await apiResetConfirm(body);
    } catch (err) {
      wrapApiError(err);
    }
  },
};

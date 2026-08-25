/**
 * SDK identity module — wraps user management endpoints (admin + self-service).
 */
import {
  listUsers as apiListUsers,
  updateUserStatus as apiUpdateUserStatus,
} from "@workspace/api-client-react";
import type {
  ListUsersParams,
  UpdateUserStatusRequest,
} from "@workspace/api-client-react";
import type { PaginatedResult, UserProfile } from "@workspace/shared-types";
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
      payload: { message?: string; error?: string; correlationId?: string };
    };
    throw new SdkError({
      statusCode: e.status,
      message: e.payload?.message ?? "Request failed",
      error: e.payload?.error,
      correlationId: e.payload?.correlationId,
    });
  }
  throw err;
}

export const identityModule = {
  async listUsers(
    params?: ListUsersParams,
  ): Promise<PaginatedResult<UserProfile>> {
    try {
      return (await apiListUsers(
        params,
      )) as unknown as PaginatedResult<UserProfile>;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async updateUserStatus(
    userId: string,
    status: UpdateUserStatusRequest["status"],
  ): Promise<UserProfile> {
    try {
      return (await apiUpdateUserStatus(userId, {
        status,
      })) as unknown as UserProfile;
    } catch (err) {
      wrapApiError(err);
    }
  },
};

/**
 * SDK wallet module — wraps wallet and transaction endpoints.
 */
import {
  getWallet as apiGetWallet,
  topUpWallet as apiTopUp,
  listTransactions as apiGetTransactions,
  getDashboard as apiGetDashboard,
} from '@workspace/api-client-react';
import type {
  TopUpRequest as ApiTopUpRequest,
  ListTransactionsParams,
} from '@workspace/api-client-react';
import type {
  WalletSummary,
  TopUpResponse,
  PaginatedResult,
  WalletTransaction,
  DashboardSummary,
} from '@workspace/shared-types';
import { SdkError } from '../errors';

function wrapApiError(err: unknown): never {
  if (
    err !== null &&
    typeof err === 'object' &&
    'status' in err &&
    'payload' in err
  ) {
    const e = err as { status: number; payload: { message?: string; error?: string; correlationId?: string } };
    throw new SdkError({
      statusCode: e.status,
      message: e.payload?.message ?? 'Request failed',
      error: e.payload?.error,
      correlationId: e.payload?.correlationId,
    });
  }
  throw err;
}

export const walletModule = {
  async getWallet(): Promise<WalletSummary> {
    try {
      return await apiGetWallet() as unknown as WalletSummary;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async topUp(request: ApiTopUpRequest): Promise<TopUpResponse> {
    try {
      return await apiTopUp(request) as unknown as TopUpResponse;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async getTransactions(
    params?: ListTransactionsParams,
  ): Promise<PaginatedResult<WalletTransaction>> {
    try {
      return await apiGetTransactions(params) as unknown as PaginatedResult<WalletTransaction>;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async getDashboard(): Promise<DashboardSummary> {
    try {
      return await apiGetDashboard() as unknown as DashboardSummary;
    } catch (err) {
      wrapApiError(err);
    }
  },
};

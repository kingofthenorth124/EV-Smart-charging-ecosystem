/**
 * SDK charging module — wraps station and session endpoints.
 */
import {
  listStations as apiGetStations,
  startSession as apiStartSession,
  stopSession as apiStopSession,
  getActiveSession as apiGetActiveSession,
  listSessions as apiGetSessions,
} from '@workspace/api-client-react';
import type {
  StartSessionRequest as ApiStartSessionRequest,
  ListSessionsParams,
} from '@workspace/api-client-react';
import type {
  Station,
  ChargingSession,
  PaginatedResult,
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

export const chargingModule = {
  async getStations(): Promise<Station[]> {
    try {
      return await apiGetStations() as unknown as Station[];
    } catch (err) {
      wrapApiError(err);
    }
  },

  async startSession(request: ApiStartSessionRequest): Promise<ChargingSession> {
    try {
      return await apiStartSession(request) as unknown as ChargingSession;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async stopSession(sessionId: string): Promise<ChargingSession> {
    try {
      return await apiStopSession(sessionId) as unknown as ChargingSession;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async getActiveSession(): Promise<ChargingSession | null> {
    try {
      return await apiGetActiveSession() as unknown as ChargingSession | null;
    } catch (err) {
      wrapApiError(err);
    }
  },

  async getSessions(
    params?: ListSessionsParams,
  ): Promise<PaginatedResult<ChargingSession>> {
    try {
      return await apiGetSessions(params) as unknown as PaginatedResult<ChargingSession>;
    } catch (err) {
      wrapApiError(err);
    }
  },
};

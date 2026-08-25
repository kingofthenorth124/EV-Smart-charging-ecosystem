/**
 * Global API client configuration: bearer tokens + correlation IDs.
 * Imported once from main.tsx before the app renders.
 */
import {
  setAuthTokenGetter,
  setDefaultHeadersGetter,
} from "@workspace/api-client-react";
import { getAccessToken } from "./auth-tokens";

function newCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function configureApiClient(): void {
  setAuthTokenGetter(getAccessToken);
  // Fresh correlation ID per request, threaded to the backend's
  // CorrelationIdInterceptor via the X-Correlation-ID header.
  setDefaultHeadersGetter(() => ({ "x-correlation-id": newCorrelationId() }));
}

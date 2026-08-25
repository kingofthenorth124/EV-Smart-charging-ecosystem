/**
 * @workspace/sdk
 *
 * Typed platform SDK for the Camel Mobility Wallet.
 *
 * Provides centralized, typed access to all platform APIs with:
 * - Structured error handling via SdkError
 * - Typed request/response contracts from @workspace/shared-types
 * - Configurable base URL + auth token getter (for mobile clients)
 * - Standard correlation-ID propagation
 *
 * Create a client once at application bootstrap:
 *   import { createClient } from '@workspace/sdk';
 *   const sdk = createClient(); // web — same-origin, no baseUrl needed
 *
 * For mobile (Expo):
 *   const sdk = createClient({ baseUrl: process.env.API_URL, authTokenGetter });
 */

// Client factory
export { createClient } from "./client";
export type { CamelMobilityClient } from "./client";

// Configuration
export type { SdkClientOptions, SdkResult } from "./types";
export { wrapResult } from "./types";

// Error handling
export { SdkError, isSdkError, extractErrorMessage } from "./errors";

// Module re-exports (for granular imports)
export { authModule } from "./modules/auth";
export { walletModule } from "./modules/wallet";
export { chargingModule } from "./modules/charging";
export { identityModule } from "./modules/identity";

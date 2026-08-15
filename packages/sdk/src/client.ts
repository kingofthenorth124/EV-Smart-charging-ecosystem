/**
 * CamelMobilityClient — the top-level SDK factory.
 *
 * Usage (web app — no baseUrl needed, same-origin requests):
 *   import { createClient } from '@workspace/sdk';
 *   const sdk = createClient();
 *   const user = await sdk.auth.getCurrentUser();
 *
 * Usage (Expo / React Native — remote API):
 *   const sdk = createClient({
 *     baseUrl: 'https://api.camel-mobility.com',
 *     authTokenGetter: () => SecureStore.getItemAsync('access_token'),
 *   });
 */
import {
  setBaseUrl,
  setAuthTokenGetter,
  setDefaultHeadersGetter,
} from '@workspace/api-client-react';
import type { SdkClientOptions } from './types';
import { authModule } from './modules/auth';
import { walletModule } from './modules/wallet';
import { chargingModule } from './modules/charging';
import { identityModule } from './modules/identity';

export interface CamelMobilityClient {
  auth: typeof authModule;
  wallet: typeof walletModule;
  charging: typeof chargingModule;
  identity: typeof identityModule;
}

/**
 * Initialise and return the Camel Mobility SDK client.
 * Call this once at application bootstrap.
 */
export function createClient(options: SdkClientOptions = {}): CamelMobilityClient {
  if (options.baseUrl) {
    setBaseUrl(options.baseUrl);
  }
  if (options.authTokenGetter) {
    setAuthTokenGetter(options.authTokenGetter);
  }
  if (options.defaultHeadersGetter) {
    setDefaultHeadersGetter(options.defaultHeadersGetter);
  }

  return {
    auth: authModule,
    wallet: walletModule,
    charging: chargingModule,
    identity: identityModule,
  };
}

/**
 * Browser-side Gatekeeper API client.
 *
 * Singleton that reads the Aegis bearer token from localStorage and keeps it
 * in sync with the AuthClient — so once the user has logged in via Aegis,
 * every call to the Gatekeeper admin API carries the right token.
 *
 * Mirrors the shape of lib/browserClient.ts (the Aegis wrapper).
 */

import { GatekeeperClient } from '@jmazzahacks/api-gatekeeper-api';

// Required. The underlying client uses `new URL()`, which rejects relative
// paths, so this must be an absolute URL. Baked in at build time via
// build-publish.sh; see .env.local for dev.
const GATEKEEPER_API_URL = process.env.NEXT_PUBLIC_GATEKEEPER_API_URL ?? '';

let singleton: GatekeeperClient | null = null;

export function getGatekeeperClient(): GatekeeperClient {
  if (singleton) {
    // Re-sync the token in case it was refreshed/logged-in elsewhere.
    syncTokenFromStorage(singleton);
    return singleton;
  }

  singleton = new GatekeeperClient({ baseUrl: GATEKEEPER_API_URL });
  syncTokenFromStorage(singleton);
  return singleton;
}

function syncTokenFromStorage(client: GatekeeperClient): void {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('auth_token');
  client.setToken(token ?? undefined);
}

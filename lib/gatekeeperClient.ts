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

let singleton: GatekeeperClient | null = null;

export function getGatekeeperClient(): GatekeeperClient {
  if (singleton) {
    // Re-sync the token in case it was refreshed/logged-in elsewhere.
    syncTokenFromStorage(singleton);
    return singleton;
  }

  // Same-origin: the gatekeeper backend lives behind the same nginx host as
  // this frontend. The underlying client uses `new URL()` which rejects
  // relative paths, so we anchor on window.location.origin.
  if (typeof window === 'undefined') {
    throw new Error('getGatekeeperClient must be called in the browser');
  }
  singleton = new GatekeeperClient({ baseUrl: window.location.origin });
  syncTokenFromStorage(singleton);
  return singleton;
}

function syncTokenFromStorage(client: GatekeeperClient): void {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('auth_token');
  client.setToken(token ?? undefined);
}

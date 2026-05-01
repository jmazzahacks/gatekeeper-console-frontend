/**
 * Browser-side auth clients using byteforge-aegis-client-js.
 *
 * Two singleton clients exist in the browser:
 *
 * - getAuthClient() — points at Aegis directly (NEXT_PUBLIC_AEGIS_API_URL).
 *   Used for bearer-gated calls: refresh, me, logout, confirm-email-change.
 *   These don't require X-Tenant-Api-Key.
 *
 * - getProxyClient() — points at the gatekeeper backend (NEXT_PUBLIC_GATEKEEPER_API_URL).
 *   Used for the six tenant-key-gated public auth calls: register, login,
 *   verify-email, check-verification-token, request-password-reset,
 *   reset-password. The backend attaches the tenant key server-side.
 */

import { AuthClient } from 'byteforge-aegis-client-js';
import type { LoginResponse, RefreshTokenResponse, ApiResponse } from 'byteforge-aegis-client-js';

const AEGIS_API_URL = process.env.NEXT_PUBLIC_AEGIS_API_URL || 'https://aegis.example.com';
const GATEKEEPER_API_URL = process.env.NEXT_PUBLIC_GATEKEEPER_API_URL ?? '';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'gatekeeper';
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'gatekeeper.example.com';

// Aegis genuinely requires site_id in every gated request body — it's the
// lookup key the @require_tenant_api_key middleware uses to find which
// tenant key to HMAC-compare against the X-Tenant-Api-Key header.
//
// However, our proxy backend (docker-backend's /api/auth/* routes) drops
// any body-supplied site_id and substitutes its own server-side AEGIS_SITE_ID
// before calling Aegis. So the value the browser sends is overwritten before
// it reaches Aegis, and any non-zero placeholder satisfies the JS client's
// required-arg check without affecting the actual lookup.
const PROXY_SITE_ID_STUB = 1;

let authSingleton: AuthClient | null = null;
let proxySingleton: AuthClient | null = null;

export function getAuthClient(): AuthClient {
  if (authSingleton) {
    return authSingleton;
  }

  authSingleton = new AuthClient({
    apiUrl: AEGIS_API_URL,
    siteId: PROXY_SITE_ID_STUB,
    autoRefresh: false,
  });

  if (typeof window !== 'undefined') {
    const authToken = localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (authToken) {
      authSingleton.setAuthToken(authToken);
    }
    if (refreshToken) {
      authSingleton.setRefreshToken(refreshToken);
    }
  }

  return authSingleton;
}

export function getProxyClient(): AuthClient {
  if (proxySingleton) {
    return proxySingleton;
  }

  proxySingleton = new AuthClient({
    apiUrl: GATEKEEPER_API_URL,
    siteId: PROXY_SITE_ID_STUB,
    autoRefresh: false,
  });

  return proxySingleton;
}

export function initAuthClientFromLogin(loginResponse: LoginResponse): void {
  localStorage.setItem('auth_token', loginResponse.auth_token.token);
  localStorage.setItem('refresh_token', loginResponse.refresh_token.token);
  localStorage.setItem('token_expires_at', loginResponse.auth_token.expires_at.toString());
  localStorage.setItem('user_id', loginResponse.auth_token.user_id.toString());

  authSingleton = new AuthClient({
    apiUrl: AEGIS_API_URL,
    siteId: PROXY_SITE_ID_STUB,
    autoRefresh: false,
  });
  authSingleton.setTokensFromLoginResponse(loginResponse);
}

interface RefreshResult {
  success: boolean;
  expiresAt?: number;
}

export async function refreshAuthTokens(): Promise<RefreshResult> {
  const client = getAuthClient();
  const result: ApiResponse<RefreshTokenResponse> = await client.refreshAuthToken();

  if (!result.success) {
    return { success: false };
  }

  const { auth_token, refresh_token } = result.data;

  localStorage.setItem('auth_token', auth_token.token);
  localStorage.setItem('token_expires_at', auth_token.expires_at.toString());
  client.setAuthToken(auth_token.token);

  if (refresh_token) {
    localStorage.setItem('refresh_token', refresh_token.token);
    client.setRefreshToken(refresh_token.token);
  }

  return { success: true, expiresAt: auth_token.expires_at };
}

export function isTokenExpired(bufferSeconds: number = 300): boolean {
  const expiresAtStr = localStorage.getItem('token_expires_at');
  if (!expiresAtStr) {
    return true;
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= (expiresAt - bufferSeconds);
}

export function clearAuthClient(): void {
  if (authSingleton) {
    authSingleton.clearAllTokens();
  }
  authSingleton = null;
  proxySingleton = null;

  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token_expires_at');
  localStorage.removeItem('user_id');
  // Stale keys from the older dynamic-site-lookup version of this app.
  localStorage.removeItem('site_id');
  localStorage.removeItem('site_name');
}

export function getSiteName(): string {
  return SITE_NAME;
}

export function getSiteDomain(): string {
  return SITE_DOMAIN;
}

export { AuthClient };
export type { LoginResponse };

/**
 * Browser-side auth clients using byteforge-aegis-client-js.
 *
 * Two singleton clients exist in the browser:
 *
 * - getAuthClient() — points at Aegis directly (runtime config: aegisApiUrl).
 *   Used for bearer-gated calls: refresh, me, logout, confirm-email-change.
 *   These don't require X-Tenant-Api-Key.
 *
 * - getProxyClient() — points at the gatekeeper backend (same-origin).
 *   Used for the six tenant-key-gated public auth calls: register, login,
 *   verify-email, check-verification-token, request-password-reset,
 *   reset-password. The backend attaches the tenant key server-side.
 *
 * URLs are pulled from getRuntimeConfig() which is populated at boot by
 * RuntimeConfigBootstrap fetching /api/config from the gatekeeper backend.
 */

import { AuthClient } from 'byteforge-aegis-client-js';
import type { LoginResponse, RefreshTokenResponse, ApiResponse } from 'byteforge-aegis-client-js';
import { getRuntimeConfig } from './runtimeConfig';

// Aegis genuinely requires site_id in every gated request body — it's the
// lookup key the @require_tenant_api_key middleware uses to find which
// tenant key to HMAC-compare against the X-Tenant-Api-Key header.
//
// However, our proxy backend (gatekeeper-backend's /api/auth/* routes) drops
// any body-supplied site_id and substitutes its own server-side AEGIS_SITE_ID
// before calling Aegis. So the value the browser sends is overwritten before
// it reaches Aegis, and any well-formed placeholder satisfies the JS client's
// required-arg check without affecting the actual lookup. Post Aegis phase-3
// the client types `siteId` as a UUID string, so we hand it the zero-UUID
// stub (never reaches Aegis; the proxy overrides it upstream).
const PROXY_SITE_ID_STUB = '00000000-0000-0000-0000-000000000000';

// Same-origin proxy URL. The gatekeeper backend lives behind the same nginx
// host as this frontend, so a relative-path AuthClient resolves to the right
// place without crossing origins.
const PROXY_API_URL = '';

let authSingleton: AuthClient | null = null;
let proxySingleton: AuthClient | null = null;

export function getAuthClient(): AuthClient {
  if (authSingleton) {
    return authSingleton;
  }

  const { aegisApiUrl } = getRuntimeConfig();
  authSingleton = new AuthClient({
    apiUrl: aegisApiUrl,
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
    apiUrl: PROXY_API_URL,
    siteId: PROXY_SITE_ID_STUB,
    autoRefresh: false,
  });

  return proxySingleton;
}

export function initAuthClientFromLogin(loginResponse: LoginResponse): void {
  localStorage.setItem('auth_token', loginResponse.auth_token.token);
  localStorage.setItem('refresh_token', loginResponse.refresh_token.token);
  localStorage.setItem('token_expires_at', loginResponse.auth_token.expires_at.toString());
  // Post Aegis phase-3 the identifier on the wire is a UUID string, not an int
  // — no `.toString()` needed. Reading `.user_id` on the v3.0.0 auth_token
  // shape is `undefined`, and `.toString()` on that used to throw
  // synchronously right here, leaving the login button stuck on `loading`.
  localStorage.setItem('user_uuid', loginResponse.auth_token.user_uuid);

  const { aegisApiUrl } = getRuntimeConfig();
  authSingleton = new AuthClient({
    apiUrl: aegisApiUrl,
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
  localStorage.removeItem('user_uuid');
  // Stale keys from the older int-id (`user_id`, `site_id`) and
  // dynamic-site-lookup (`site_name`) versions of this app. Kept in the
  // removal list so anyone who logged in during the shim window gets a
  // clean localStorage on next sign-out.
  localStorage.removeItem('user_id');
  localStorage.removeItem('site_id');
  localStorage.removeItem('site_name');
}

export function getSiteName(): string {
  return getRuntimeConfig().siteName;
}

export function getSiteDomain(): string {
  return getRuntimeConfig().siteDomain;
}

export { AuthClient };
export type { LoginResponse };

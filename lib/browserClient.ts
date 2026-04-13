/**
 * Browser-side auth client using byteforge-aegis-client-js directly.
 * Uses a singleton AuthClient that persists tokens in memory and syncs to localStorage.
 */

import { AuthClient } from 'byteforge-aegis-client-js';
import type { LoginResponse, RefreshTokenResponse, ApiResponse } from 'byteforge-aegis-client-js';

const AEGIS_API_URL = process.env.NEXT_PUBLIC_AEGIS_API_URL || 'https://aegis.example.com';
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'gatekeeper.example.com';

let singleton: AuthClient | null = null;

export function getAuthClient(): AuthClient {
  if (singleton) {
    return singleton;
  }

  const siteIdStr = typeof window !== 'undefined' ? localStorage.getItem('site_id') : null;
  const siteId = siteIdStr ? parseInt(siteIdStr, 10) : undefined;

  singleton = new AuthClient({
    apiUrl: AEGIS_API_URL,
    siteId,
    autoRefresh: false,
  });

  if (typeof window !== 'undefined') {
    const authToken = localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (authToken) {
      singleton.setAuthToken(authToken);
    }
    if (refreshToken) {
      singleton.setRefreshToken(refreshToken);
    }
  }

  return singleton;
}

export function getAuthClientForSite(siteId: number): AuthClient {
  return new AuthClient({ apiUrl: AEGIS_API_URL, siteId, autoRefresh: false });
}

export function initAuthClientFromLogin(loginResponse: LoginResponse, siteId: number, siteName: string): void {
  localStorage.setItem('auth_token', loginResponse.auth_token.token);
  localStorage.setItem('refresh_token', loginResponse.refresh_token.token);
  localStorage.setItem('token_expires_at', loginResponse.auth_token.expires_at.toString());
  localStorage.setItem('user_id', loginResponse.auth_token.user_id.toString());
  localStorage.setItem('site_id', siteId.toString());
  localStorage.setItem('site_name', siteName);

  singleton = new AuthClient({
    apiUrl: AEGIS_API_URL,
    siteId,
    autoRefresh: false,
  });
  singleton.setTokensFromLoginResponse(loginResponse);
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
  if (singleton) {
    singleton.clearAllTokens();
  }
  singleton = null;

  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token_expires_at');
  localStorage.removeItem('user_id');
  localStorage.removeItem('site_id');
  localStorage.removeItem('site_name');
}

export function getSiteDomain(): string {
  return SITE_DOMAIN;
}

export { AuthClient };
export type { LoginResponse };

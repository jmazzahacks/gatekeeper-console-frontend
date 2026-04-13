'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { clearAuthClient, isTokenExpired, refreshAuthTokens } from './browserClient';

const REFRESH_CHECK_INTERVAL_MS = 60_000;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  siteId: string | null;
  siteName: string | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    siteId: null,
    siteName: null,
    token: null,
    refreshToken: null,
    tokenExpiresAt: null,
  });

  const isRefreshing = useRef(false);

  const attemptRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current) {
      return false;
    }

    isRefreshing.current = true;
    try {
      const result = await refreshAuthTokens();
      if (result.success && result.expiresAt) {
        const newToken = localStorage.getItem('auth_token');
        const newRefreshToken = localStorage.getItem('refresh_token');
        setState((prev) => ({
          ...prev,
          token: newToken,
          refreshToken: newRefreshToken,
          tokenExpiresAt: result.expiresAt ?? null,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const refreshTokenVal = localStorage.getItem('refresh_token');
    const tokenExpiresAtStr = localStorage.getItem('token_expires_at');
    const userId = localStorage.getItem('user_id');
    const siteId = localStorage.getItem('site_id');
    const siteName = localStorage.getItem('site_name');

    if (!token) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        userId,
        siteId,
        siteName,
        token: null,
        refreshToken: null,
        tokenExpiresAt: null,
      });
      return;
    }

    setState({
      isAuthenticated: true,
      isLoading: false,
      userId,
      siteId,
      siteName,
      token,
      refreshToken: refreshTokenVal,
      tokenExpiresAt: tokenExpiresAtStr ? parseInt(tokenExpiresAtStr, 10) : null,
    });

    if (isTokenExpired()) {
      attemptRefresh().then((success) => {
        if (!success) {
          logout();
        }
      });
    }
  }, [attemptRefresh]);

  useEffect(() => {
    if (!state.isAuthenticated) {
      return;
    }

    const intervalId = setInterval(() => {
      if (isTokenExpired()) {
        attemptRefresh().then((success) => {
          if (!success) {
            logout();
          }
        });
      }
    }, REFRESH_CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [state.isAuthenticated, attemptRefresh]);

  return state;
}

export function logout(): void {
  clearAuthClient();
  window.location.href = '/';
}

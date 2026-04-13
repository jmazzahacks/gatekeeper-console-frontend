'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { getAuthClient } from '@/lib/browserClient';

type VerifyStatus = 'checking' | 'idle' | 'loading' | 'success' | 'error';

interface TokenInfo {
  passwordRequired: boolean;
  email: string;
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('Verify');
  const tCommon = useTranslations('Common');

  const [status, setStatus] = useState<VerifyStatus>('checking');
  const [message, setMessage] = useState('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('invalidToken'));
      return;
    }

    const checkToken = async () => {
      const client = getAuthClient();
      const result = await client.checkVerificationToken(token);

      if (result.success && result.data) {
        setTokenInfo({
          passwordRequired: result.data.password_required,
          email: result.data.email,
        });
        setStatus('idle');
      } else if (!result.success) {
        setStatus('error');
        setMessage(result.error || t('invalidToken'));
      }
    };

    checkToken();
  }, [token, t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!token) return;

    if (tokenInfo?.passwordRequired) {
      if (password !== confirmPassword) {
        setValidationError(t('passwordsDoNotMatch'));
        return;
      }
    }

    setStatus('loading');
    setMessage(t('verifying'));

    const client = getAuthClient();
    const passwordToSend = tokenInfo?.passwordRequired ? password : undefined;
    const result = await client.verifyEmail(token, passwordToSend);

    if (result.success && result.data) {
      setStatus('success');
      setMessage(t('verificationSuccess'));

      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } else if (!result.success) {
      setStatus('error');
      setMessage(result.error || t('verificationFailed'));
    }
  };

  // Checking token state
  if (status === 'checking') {
    return (
      <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--amber-glow)]/10 flex items-center justify-center">
            <div className="spinner border-[var(--amber-glow)] border-t-transparent" />
          </div>
          <p className="text-[var(--foreground-muted)] font-medium">
            {t('checkingToken')}
          </p>
        </div>
      </main>
    );
  }

  // Error state (invalid/expired token)
  if (status === 'error' && !tokenInfo) {
    return (
      <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
        <div className="relative z-10 w-full max-w-md">
          <div className="card p-8 animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--error-red)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--error-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h2 className="font-display text-2xl font-bold mb-3 text-[var(--error-red)]">
                {t('verificationFailed')}
              </h2>
              <p className="text-[var(--foreground-muted)] mb-6">{message}</p>

              <Link href="/login" className="btn-secondary inline-flex">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
        <div className="relative z-10 w-full max-w-md">
          <div className="card p-8 animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--success-green)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--success-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="font-display text-2xl font-bold mb-3 text-[var(--success-green)]">
                {t('verificationSuccess')}
              </h2>
              <p className="text-[var(--foreground-muted)]">{t('redirectingToLogin')}</p>

              <div className="mt-4 flex justify-center">
                <div className="spinner border-[var(--amber-glow)] border-t-transparent" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Form state (idle or loading with tokenInfo)
  return (
    <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors mb-8 animate-fade-in"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">{t('backToLogin')}</span>
        </Link>

        <div className="card p-8 md:p-10 animate-scale-in delay-100">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
              {tokenInfo?.passwordRequired ? t('titleSetPassword') : t('title')}
            </h1>
            {tokenInfo?.email && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--amber-glow)]/10 text-[var(--amber-glow)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold">{tokenInfo.email}</span>
              </div>
            )}
          </div>

          {/* Status/Error message */}
          {(status === 'error' || validationError) && (
            <div className="mb-6 text-center animate-fade-in status-error">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {validationError || message}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {tokenInfo?.passwordRequired && (
              <>
                <div className="animate-fade-in-up delay-200">
                  <label htmlFor="password" className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                    {t('passwordLabel')}
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder={t('passwordPlaceholder')}
                    disabled={status === 'loading'}
                    autoComplete="new-password"
                  />
                </div>

                <div className="animate-fade-in-up delay-300">
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                    {t('confirmPasswordLabel')}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder={t('confirmPasswordPlaceholder')}
                    disabled={status === 'loading'}
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            <div className="pt-2 animate-fade-in-up delay-400">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-primary"
              >
                {status === 'loading' ? (
                  <>
                    <div className="spinner" />
                    {t('verifying')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {tokenInfo?.passwordRequired ? t('setPasswordButton') : t('verifyButton')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer text */}
        <p className="text-center text-sm text-[var(--foreground-muted)] mt-8 animate-fade-in delay-500">
          <span className="font-display">
            <span className="text-[var(--foreground)]">Gatekeeper</span>{' '}
            <span className="text-[var(--amber-glow)]">Console</span>
          </span>
          {' '}&middot; {tCommon('secureVerification')}
        </p>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  const t = useTranslations('Common');

  return (
    <Suspense fallback={
      <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--amber-glow)]/10 flex items-center justify-center">
            <div className="spinner border-[var(--amber-glow)] border-t-transparent" />
          </div>
          <p className="text-[var(--foreground-muted)] font-medium">{t('loading')}</p>
        </div>
      </main>
    }>
      <VerifyContent />
    </Suspense>
  );
}

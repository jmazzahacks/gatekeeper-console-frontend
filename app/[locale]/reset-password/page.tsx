'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { getAuthClient } from '@/lib/browserClient';

type ResetPasswordStatus = 'idle' | 'loading' | 'success' | 'error';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('ResetPassword');
  const tCommon = useTranslations('Common');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<ResetPasswordStatus>('idle');
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  const token = searchParams.get('token');

  // No token provided
  if (!token) {
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
                {t('resetFailed')}
              </h2>
              <p className="text-[var(--foreground-muted)] mb-6">{t('invalidToken')}</p>

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError(t('passwordsDoNotMatch'));
      return;
    }

    setStatus('loading');
    setMessage(t('resetting'));

    const client = getAuthClient();
    const result = await client.resetPassword(token, password);

    if (result.success && result.data) {
      setStatus('success');
      setMessage(t('successMessage'));

      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } else if (!result.success) {
      setStatus('error');
      setMessage(result.error || t('resetFailed'));
    }
  };

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
                {t('successTitle')}
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

  return (
    <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors mb-8 animate-fade-in"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">{t('backToLogin')}</span>
        </Link>

        {/* Reset password card */}
        <div className="card p-8 md:p-10 animate-scale-in delay-100">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
              {t('title')}
            </h1>
            <p className="text-[var(--foreground-muted)]">
              {t('subtitle')}
            </p>
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

            <div className="pt-2 animate-fade-in-up delay-400">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-primary"
              >
                {status === 'loading' ? (
                  <>
                    <div className="spinner" />
                    {t('resetting')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {t('resetButton')}
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
          {' '}&middot; {tCommon('secureAuthentication')}
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}

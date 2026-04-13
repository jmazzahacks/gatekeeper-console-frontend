'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getAuthClient, getSiteDomain } from '@/lib/browserClient';

interface Site {
  id: number;
  name: string;
  domain: string;
}

type ForgotPasswordStatus = 'idle' | 'loading' | 'success' | 'error';

function ForgotPasswordContent() {
  const t = useTranslations('ForgotPassword');
  const tLogin = useTranslations('Login');
  const tCommon = useTranslations('Common');

  const [site, setSite] = useState<Site | null>(null);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<ForgotPasswordStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSite = async () => {
      const siteDomain = getSiteDomain();
      const client = getAuthClient();
      const result = await client.getSiteByDomain(siteDomain);

      if (result.success && result.data) {
        setSite(result.data as Site);
      } else if (!result.success) {
        setSiteError(result.error || tLogin('siteNotFound'));
      }
    };

    fetchSite();
  }, [tLogin]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!site) return;

    setStatus('loading');
    setMessage(t('sending'));

    const client = getAuthClient();
    const result = await client.requestPasswordReset(email, site.id);

    // Always show success for security (don't reveal if email exists)
    if (result.success) {
      setStatus('success');
    } else {
      // Still show success message for security
      setStatus('success');
    }
  };

  // Error state
  if (siteError) {
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
                {tLogin('accessDenied')}
              </h2>
              <p className="text-[var(--foreground-muted)] mb-6">{siteError}</p>

              <Link href="/" className="btn-secondary inline-flex">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {tCommon('backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Loading state (fetching site)
  if (!site) {
    return (
      <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--amber-glow)]/10 flex items-center justify-center">
            <div className="spinner border-[var(--amber-glow)] border-t-transparent" />
          </div>
          <p className="text-[var(--foreground-muted)] font-medium">
            {tLogin('initializingConnection')}
          </p>
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="font-display text-2xl font-bold mb-3 text-[var(--success-green)]">
                {t('successTitle')}
              </h2>
              <p className="text-[var(--foreground-muted)] mb-6">{t('successMessage')}</p>

              <Link href="/login" className="btn-primary inline-flex">
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

        {/* Forgot password card */}
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

          {/* Status message */}
          {status === 'error' && (
            <div className="mb-6 text-center animate-fade-in status-error">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {message}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="animate-fade-in-up delay-200">
              <label htmlFor="email" className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder={t('emailPlaceholder')}
                disabled={status === 'loading'}
                autoComplete="email"
              />
            </div>

            <div className="pt-2 animate-fade-in-up delay-300">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-primary"
              >
                {status === 'loading' ? (
                  <>
                    <div className="spinner" />
                    {t('sending')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t('sendResetLink')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer text */}
        <p className="text-center text-sm text-[var(--foreground-muted)] mt-8 animate-fade-in delay-400">
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

export default function ForgotPasswordPage() {
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
      <ForgotPasswordContent />
    </Suspense>
  );
}

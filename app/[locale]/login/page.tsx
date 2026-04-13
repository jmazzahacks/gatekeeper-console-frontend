'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { getAuthClient, getAuthClientForSite, getSiteDomain, initAuthClientFromLogin } from '@/lib/browserClient';

interface Site {
  id: number;
  name: string;
  domain: string;
}

type LoginStatus = 'idle' | 'loading' | 'success' | 'error';

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

function LoginContent() {
  const router = useRouter();
  const t = useTranslations('Login');
  const tCommon = useTranslations('Common');
  const [site, setSite] = useState<Site | null>(null);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSite = async () => {
      const siteDomain = getSiteDomain();
      const client = getAuthClient();
      const result = await client.getSiteByDomain(siteDomain);

      if (result.success && result.data) {
        setSite(result.data as Site);
      } else if (!result.success) {
        setSiteError(result.error || t('siteNotFound'));
      }
    };

    fetchSite();
  }, [t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!site) return;

    setStatus('loading');
    setMessage(t('signingIn'));

    const client = getAuthClientForSite(site.id);
    const result = await client.login(email, password);

    if (result.success && result.data) {
      initAuthClientFromLogin(result.data, site.id, site.name);

      setStatus('success');
      setMessage(t('accessGranted'));

      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } else if (!result.success) {
      setStatus('error');
      setMessage(result.error || t('authenticationFailed'));
    }
  };

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
                {t('accessDenied')}
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

  if (!site) {
    return (
      <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--amber-glow)]/10 flex items-center justify-center">
            <div className="spinner border-[var(--amber-glow)] border-t-transparent" />
          </div>
          <p className="text-[var(--foreground-muted)] font-medium">
            {t('initializingConnection')}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors mb-8 animate-fade-in"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">{tCommon('back')}</span>
        </Link>

        <div className="card p-8 md:p-10 animate-scale-in delay-100">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
              {t('title')}
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--amber-glow)]/10 text-[var(--amber-glow)]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-sm font-semibold">{site.name}</span>
            </div>
          </div>

          {status !== 'idle' && status !== 'loading' && (
            <div className={`mb-6 text-center animate-fade-in ${
              status === 'success' ? 'status-success' : 'status-error'
            }`}>
              <div className="flex items-center justify-center gap-2">
                {status === 'success' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {message}
              </div>
            </div>
          )}

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
                disabled={status === 'loading' || status === 'success'}
                autoComplete="email"
              />
            </div>

            <div className="animate-fade-in-up delay-300">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-[var(--foreground)]">
                  {t('passwordLabel')}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[var(--amber-glow)] hover:text-[var(--amber-glow)]/80 transition-colors"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder={t('passwordPlaceholder')}
                disabled={status === 'loading' || status === 'success'}
                autoComplete="current-password"
              />
            </div>

            <div className="pt-2 animate-fade-in-up delay-400">
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="btn-primary"
              >
                {status === 'loading' ? (
                  <>
                    <div className="spinner" />
                    {t('signingIn')}
                  </>
                ) : status === 'success' ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t('accessGranted')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {t('signInButton')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

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

export default function LoginPage() {
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
      <LoginContent />
    </Suspense>
  );
}

'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { getAuthClient, getAuthClientForSite, getSiteDomain, initAuthClientFromLogin } from '@/lib/browserClient';
import ConsoleFrame from '@/components/ConsoleFrame';

interface Site {
  id: number;
  name: string;
  domain: string;
}

type LoginStatus = 'idle' | 'loading' | 'success' | 'error';

function SiteBadge({ site }: { site: Site }) {
  return (
    <span className="inline-flex items-center gap-2 px-2 py-0.5 border border-[var(--hairline)] text-[var(--amber)]">
      <span className="status-dot ok" aria-hidden />
      <span className="brand-word text-[10px]">{site.name}</span>
    </span>
  );
}

function FallbackLoader({ label }: { label: string }) {
  return (
    <ConsoleFrame>
      <div className="flex items-center justify-center gap-3 py-12">
        <div className="spinner" />
        <span className="text-mono-xs">{label}</span>
      </div>
    </ConsoleFrame>
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
      setTimeout(() => router.push('/dashboard'), 400);
    } else if (!result.success) {
      setStatus('error');
      setMessage(result.error || t('authenticationFailed'));
    }
  };

  if (siteError) {
    return (
      <ConsoleFrame crumb="auth › error">
        <div className="card p-8 animate-scale-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="status-dot err" aria-hidden />
            <h1 className="font-display text-[var(--err)] text-base">{t('accessDenied')}</h1>
          </div>
          <p className="text-[var(--ink-dim)] text-sm mb-6">{siteError}</p>
          <Link href="/" className="btn-secondary inline-flex">
            ← {tCommon('backToHome')}
          </Link>
        </div>
      </ConsoleFrame>
    );
  }

  if (!site) {
    return <FallbackLoader label={t('initializingConnection')} />;
  }

  return (
    <ConsoleFrame
      headerRight={<SiteBadge site={site} />}
      crumb={`auth › login › ${site.domain}`}
      footnote={`host=${site.domain}`}
    >
      <div className="card p-7 md:p-8 animate-scale-in">
        <div className="flex items-baseline justify-between mb-6 border-b border-[var(--hairline)] pb-3">
          <h1 className="font-display text-base">
            <span className="caret">{t('title')}</span>
          </h1>
          <span className="text-mono-xs">{tCommon('sessionLabel')}</span>
        </div>

        {status === 'error' && (
          <div className="mb-5 status-error animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="status-dot err" aria-hidden />
              <span>{message}</span>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mb-5 status-success animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="status-dot ok" aria-hidden />
              <span>{message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="animate-fade-in-up delay-100">
            <label htmlFor="email" className="text-mono-xs block mb-1.5">
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

          <div className="animate-fade-in-up delay-200">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="text-mono-xs">
                {t('passwordLabel')}
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)] hover:text-[var(--amber)] transition-colors"
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

          <div className="pt-2 animate-fade-in-up delay-300">
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="btn-primary w-full"
            >
              {status === 'loading' ? (
                <>
                  <div className="spinner" />
                  {t('signingIn')}
                </>
              ) : (
                <>
                  {t('signInButton')}
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ConsoleFrame>
  );
}

export default function LoginPage() {
  const t = useTranslations('Common');
  return (
    <Suspense fallback={<FallbackLoader label={t('loading')} />}>
      <LoginContent />
    </Suspense>
  );
}

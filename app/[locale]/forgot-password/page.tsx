'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getAuthClient, getSiteDomain } from '@/lib/browserClient';
import ConsoleFrame from '@/components/ConsoleFrame';

interface Site {
  id: number;
  name: string;
  domain: string;
}

type ForgotPasswordStatus = 'idle' | 'loading' | 'success' | 'error';

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
    await client.requestPasswordReset(email, site.id);
    // Always show success for security (don't reveal if email exists)
    setStatus('success');
  };

  if (siteError) {
    return (
      <ConsoleFrame crumb="auth › error">
        <div className="card p-7 animate-scale-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="status-dot err" aria-hidden />
            <h1 className="font-display text-[var(--err)] text-base">{tLogin('accessDenied')}</h1>
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
    return <FallbackLoader label={tLogin('initializingConnection')} />;
  }

  if (status === 'success') {
    return (
      <ConsoleFrame crumb="auth › reset › sent">
        <div className="card p-7 animate-scale-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="status-dot ok" aria-hidden />
            <h1 className="font-display text-[var(--ok)] text-base">{t('successTitle')}</h1>
          </div>
          <p className="text-[var(--ink-dim)] text-sm mb-6">{t('successMessage')}</p>
          <Link href="/login" className="btn-secondary inline-flex">
            ← {t('backToLogin')}
          </Link>
        </div>
      </ConsoleFrame>
    );
  }

  return (
    <ConsoleFrame crumb="auth › reset" footnote={`host=${site.domain}`}>
      <div className="card p-7 md:p-8 animate-scale-in">
        <div className="flex items-baseline justify-between mb-6 border-b border-[var(--hairline)] pb-3">
          <h1 className="font-display text-base">
            <span className="caret">{t('title')}</span>
          </h1>
          <span className="text-mono-xs">reset</span>
        </div>

        <p className="text-[var(--ink-dim)] text-sm mb-5">{t('subtitle')}</p>

        {status === 'error' && (
          <div className="mb-5 status-error animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="status-dot err" aria-hidden />
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
              disabled={status === 'loading'}
              autoComplete="email"
            />
          </div>

          <div className="pt-2 animate-fade-in-up delay-200 flex items-center gap-3">
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
                  {t('sendResetLink')}
                  <span>→</span>
                </>
              )}
            </button>
            <Link
              href="/login"
              className="text-mono-xs hover:text-[var(--amber)] transition-colors"
            >
              ← {t('backToLogin')}
            </Link>
          </div>
        </form>
      </div>
    </ConsoleFrame>
  );
}

export default function ForgotPasswordPage() {
  const t = useTranslations('Common');
  return (
    <Suspense fallback={<FallbackLoader label={t('loading')} />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

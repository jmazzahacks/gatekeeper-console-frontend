'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getProxyClient, getSiteDomain } from '@/lib/browserClient';
import ConsoleFrame from '@/components/ConsoleFrame';

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
  const tCommon = useTranslations('Common');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<ForgotPasswordStatus>('idle');

  const siteDomain = getSiteDomain();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    const client = getProxyClient();
    await client.requestPasswordReset(email);
    // Always show success for security (don't reveal if email exists)
    setStatus('success');
  };

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
    <ConsoleFrame crumb="auth › reset" footnote={`host=${siteDomain}`}>
      <div className="card p-7 md:p-8 animate-scale-in">
        <div className="flex items-baseline justify-between mb-6 border-b border-[var(--hairline)] pb-3">
          <h1 className="font-display text-base">
            <span className="caret">{t('title')}</span>
          </h1>
          <span className="text-mono-xs">{tCommon('resetLabel')}</span>
        </div>

        <p className="text-[var(--ink-dim)] text-sm mb-5">{t('subtitle')}</p>

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

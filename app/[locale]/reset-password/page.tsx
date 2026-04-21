'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { getAuthClient } from '@/lib/browserClient';
import ConsoleFrame from '@/components/ConsoleFrame';

type ResetPasswordStatus = 'idle' | 'loading' | 'success' | 'error';

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

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('ResetPassword');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<ResetPasswordStatus>('idle');
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  const token = searchParams.get('token');

  if (!token) {
    return (
      <ConsoleFrame crumb="auth › reset › error">
        <div className="card p-7 animate-scale-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="status-dot err" aria-hidden />
            <h1 className="font-display text-[var(--err)] text-base">{t('resetFailed')}</h1>
          </div>
          <p className="text-[var(--ink-dim)] text-sm mb-6">{t('invalidToken')}</p>
          <Link href="/login" className="btn-secondary inline-flex">
            ← {t('backToLogin')}
          </Link>
        </div>
      </ConsoleFrame>
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
      setTimeout(() => router.push('/login'), 1200);
    } else if (!result.success) {
      setStatus('error');
      setMessage(result.error || t('resetFailed'));
    }
  };

  if (status === 'success') {
    return (
      <ConsoleFrame crumb="auth › reset › ok">
        <div className="card p-7 animate-scale-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="status-dot ok" aria-hidden />
            <h1 className="font-display text-[var(--ok)] text-base">{t('successTitle')}</h1>
          </div>
          <p className="text-[var(--ink-dim)] text-sm flex items-center gap-2">
            <span className="spinner" />
            {t('redirectingToLogin')}
          </p>
        </div>
      </ConsoleFrame>
    );
  }

  return (
    <ConsoleFrame crumb="auth › reset › new">
      <div className="card p-7 md:p-8 animate-scale-in">
        <div className="flex items-baseline justify-between mb-6 border-b border-[var(--hairline)] pb-3">
          <h1 className="font-display text-base">
            <span className="caret">{t('title')}</span>
          </h1>
          <span className="text-mono-xs">reset</span>
        </div>

        <p className="text-[var(--ink-dim)] text-sm mb-5">{t('subtitle')}</p>

        {(status === 'error' || validationError) && (
          <div className="mb-5 status-error animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="status-dot err" aria-hidden />
              <span>{validationError || message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="animate-fade-in-up delay-100">
            <label htmlFor="password" className="text-mono-xs block mb-1.5">
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

          <div className="animate-fade-in-up delay-200">
            <label htmlFor="confirmPassword" className="text-mono-xs block mb-1.5">
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

          <div className="pt-2 animate-fade-in-up delay-300 flex items-center gap-3">
            <button type="submit" disabled={status === 'loading'} className="btn-primary">
              {status === 'loading' ? (
                <>
                  <div className="spinner" />
                  {t('resetting')}
                </>
              ) : (
                <>
                  {t('resetButton')}
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

export default function ResetPasswordPage() {
  const t = useTranslations('Common');
  return (
    <Suspense fallback={<FallbackLoader label={t('loading')} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

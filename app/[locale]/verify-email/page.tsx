'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { getProxyClient } from '@/lib/browserClient';
import ConsoleFrame from '@/components/ConsoleFrame';

type VerifyStatus = 'checking' | 'idle' | 'loading' | 'success' | 'error';

interface TokenInfo {
  passwordRequired: boolean;
  email: string;
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
      const client = getProxyClient();
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

    if (tokenInfo?.passwordRequired && password !== confirmPassword) {
      setValidationError(t('passwordsDoNotMatch'));
      return;
    }

    setStatus('loading');
    setMessage(t('verifying'));

    const client = getProxyClient();
    const passwordToSend = tokenInfo?.passwordRequired ? password : undefined;
    const result = await client.verifyEmail(token, passwordToSend);

    if (result.success && result.data) {
      setStatus('success');
      setMessage(t('verificationSuccess'));
      setTimeout(() => router.push('/login'), 1200);
    } else if (!result.success) {
      setStatus('error');
      setMessage(result.error || t('verificationFailed'));
    }
  };

  if (status === 'checking') {
    return <FallbackLoader label={t('checkingToken')} />;
  }

  if (status === 'error' && !tokenInfo) {
    return (
      <ConsoleFrame crumb="auth › verify › error">
        <div className="card p-7 animate-scale-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="status-dot err" aria-hidden />
            <h1 className="font-display text-[var(--err)] text-base">{t('verificationFailed')}</h1>
          </div>
          <p className="text-[var(--ink-dim)] text-sm mb-6">{message}</p>
          <Link href="/login" className="btn-secondary inline-flex">
            ← {t('backToLogin')}
          </Link>
        </div>
      </ConsoleFrame>
    );
  }

  if (status === 'success') {
    return (
      <ConsoleFrame crumb="auth › verify › ok">
        <div className="card p-7 animate-scale-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="status-dot ok" aria-hidden />
            <h1 className="font-display text-[var(--ok)] text-base">{t('verificationSuccess')}</h1>
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
    <ConsoleFrame
      crumb="auth › verify"
      footnote={tokenInfo?.email ? `user=${tokenInfo.email}` : ''}
    >
      <div className="card p-7 md:p-8 animate-scale-in">
        <div className="flex items-baseline justify-between mb-6 border-b border-[var(--hairline)] pb-3">
          <h1 className="font-display text-base">
            <span className="caret">
              {tokenInfo?.passwordRequired ? t('titleSetPassword') : t('title')}
            </span>
          </h1>
          <span className="text-mono-xs">{tCommon('verifyLabel')}</span>
        </div>

        {tokenInfo?.email && (
          <div className="text-mono-xs mb-5 text-[var(--ink-dim)]">
            user = <span className="text-[var(--amber)]">{tokenInfo.email}</span>
          </div>
        )}

        {(status === 'error' || validationError) && (
          <div className="mb-5 status-error animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="status-dot err" aria-hidden />
              <span>{validationError || message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tokenInfo?.passwordRequired && (
            <>
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
            </>
          )}

          <div className="pt-2 animate-fade-in-up delay-300">
            <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
              {status === 'loading' ? (
                <>
                  <div className="spinner" />
                  {t('verifying')}
                </>
              ) : (
                <>
                  {tokenInfo?.passwordRequired ? t('setPasswordButton') : t('verifyButton')}
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

export default function VerifyPage() {
  const t = useTranslations('Common');
  return (
    <Suspense fallback={<FallbackLoader label={t('loading')} />}>
      <VerifyContent />
    </Suspense>
  );
}

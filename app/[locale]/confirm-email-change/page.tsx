'use client';

import { Suspense, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { getAuthClient } from '@/lib/browserClient';

type ConfirmEmailStatus = 'loading' | 'success' | 'error';

function ConfirmEmailChangeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('ConfirmEmailChange');

  const [status, setStatus] = useState<ConfirmEmailStatus>('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('invalidToken'));
      return;
    }

    const confirmEmail = async () => {
      const client = getAuthClient();
      const result = await client.confirmEmailChange(token);

      if (result.success && result.data) {
        setStatus('success');
        setMessage(t('successMessage'));

        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else if (!result.success) {
        setStatus('error');
        setMessage(result.error || t('confirmFailed'));
      }
    };

    confirmEmail();
  }, [token, t, router]);

  // Loading state
  if (status === 'loading') {
    return (
      <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
        <div className="relative z-10 w-full max-w-md">
          <div className="card p-8 animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--amber-glow)]/10 flex items-center justify-center">
                <div className="spinner border-[var(--amber-glow)] border-t-transparent w-8 h-8" />
              </div>

              <h2 className="font-display text-2xl font-bold mb-3">
                {t('title')}
              </h2>
              <p className="text-[var(--foreground-muted)]">{t('processing')}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (status === 'error') {
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
                {t('confirmFailed')}
              </h2>
              <p className="text-[var(--foreground-muted)] mb-6">{message}</p>

              <Link href="/" className="btn-secondary inline-flex">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Success state
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
            <p className="text-[var(--foreground-muted)]">{t('redirectingHome')}</p>

            <div className="mt-4 flex justify-center">
              <div className="spinner border-[var(--amber-glow)] border-t-transparent" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ConfirmEmailChangePage() {
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
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}

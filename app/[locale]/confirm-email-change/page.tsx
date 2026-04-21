'use client';

import { Suspense, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { getAuthClient } from '@/lib/browserClient';
import ConsoleFrame from '@/components/ConsoleFrame';

type ConfirmEmailStatus = 'loading' | 'success' | 'error';

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
        setTimeout(() => router.push('/'), 1500);
      } else if (!result.success) {
        setStatus('error');
        setMessage(result.error || t('confirmFailed'));
      }
    };

    confirmEmail();
  }, [token, t, router]);

  if (status === 'loading') {
    return (
      <ConsoleFrame crumb="auth › email-change">
        <div className="card p-7 animate-scale-in">
          <div className="flex items-center gap-2 mb-3">
            <div className="spinner" />
            <h1 className="font-display text-base">{t('title')}</h1>
          </div>
          <p className="text-[var(--ink-dim)] text-sm">{t('processing')}</p>
        </div>
      </ConsoleFrame>
    );
  }

  if (status === 'error') {
    return (
      <ConsoleFrame crumb="auth › email-change › error">
        <div className="card p-7 animate-scale-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="status-dot err" aria-hidden />
            <h1 className="font-display text-[var(--err)] text-base">{t('confirmFailed')}</h1>
          </div>
          <p className="text-[var(--ink-dim)] text-sm mb-6">{message}</p>
          <Link href="/" className="btn-secondary inline-flex">
            ← {t('backToHome')}
          </Link>
        </div>
      </ConsoleFrame>
    );
  }

  return (
    <ConsoleFrame crumb="auth › email-change › ok">
      <div className="card p-7 animate-scale-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="status-dot ok" aria-hidden />
          <h1 className="font-display text-[var(--ok)] text-base">{t('successTitle')}</h1>
        </div>
        <p className="text-[var(--ink-dim)] text-sm flex items-center gap-2">
          <span className="spinner" />
          {t('redirectingHome')}
        </p>
      </div>
    </ConsoleFrame>
  );
}

export default function ConfirmEmailChangePage() {
  const t = useTranslations('Common');
  return (
    <Suspense fallback={<FallbackLoader label={t('loading')} />}>
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ConsoleFrame from '@/components/ConsoleFrame';

export default function WelcomePage() {
  const t = useTranslations('Welcome');
  const tLogin = useTranslations('Login');

  return (
    <ConsoleFrame crumb="auth › provisioned">
      <div className="card p-7 md:p-8 animate-scale-in">
        <div className="flex items-baseline justify-between mb-5 border-b border-[var(--hairline)] pb-3">
          <h1 className="font-display text-base">
            <span className="caret">{t('title')}</span>
          </h1>
          <span className="inline-flex items-center gap-2 text-mono-xs">
            <span className="status-dot ok" aria-hidden />
            ok
          </span>
        </div>

        <p className="text-[var(--ink)] text-sm mb-2">{t('subtitle')}</p>
        <p className="text-[var(--ink-dim)] text-sm mb-6">{t('description')}</p>

        <Link href="/login" className="btn-primary inline-flex">
          {tLogin('signInButton')}
          <span>→</span>
        </Link>
      </div>
    </ConsoleFrame>
  );
}

'use client';

import { ReactNode, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useAuth, logout } from '@/lib/useAuth';
import BrandMark from './BrandMark';

type Props = {
  /** Right-hand text after "❯ " — e.g. "console › routes". */
  crumb: string;
  children: ReactNode;
};

/**
 * Shared chrome for every /dashboard/* page: top bar (brand + site status +
 * logout), crumb strip, footer, and the useAuth redirect gate. Pages render
 * only the content inside the main column.
 */
export default function DashboardShell({ crumb, children }: Props) {
  const router = useRouter();
  const tCommon = useTranslations('Common');
  const { isAuthenticated, isLoading, siteName } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-mono-xs animate-fade-in">
          <div className="spinner" />
          <span>{tCommon('loading')}</span>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--hairline)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
            <BrandMark size="md" />
          </Link>

          <div className="flex items-center gap-5 text-mono-xs">
            {siteName && (
              <span className="inline-flex items-center gap-2">
                <span className="status-dot ok" aria-hidden />
                <span className="text-[var(--ink)]">{siteName}</span>
              </span>
            )}
            <button
              onClick={logout}
              className="hover:text-[var(--amber)] transition-colors"
            >
              {tCommon('logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--hairline)] bg-[var(--surface-0)]">
        <div className="max-w-7xl mx-auto px-6 py-2 text-mono-xs">
          <span className="text-[var(--amber)]">❯</span>{' '}
          <span className="text-[var(--ink-faint)]">{crumb}</span>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </div>

      <footer className="border-t border-[var(--hairline)] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-mono-xs">
          <span className="inline-flex items-center gap-2">
            <span className="status-dot ok" aria-hidden />
            <span>online</span>
          </span>
          <span>{siteName ? `host=${siteName}` : ''}</span>
        </div>
      </footer>
    </main>
  );
}

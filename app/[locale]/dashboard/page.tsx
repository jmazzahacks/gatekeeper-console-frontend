'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useAuth, logout } from '@/lib/useAuth';
import BrandMark from '@/components/BrandMark';

export default function DashboardPage() {
  const router = useRouter();
  const t = useTranslations('Dashboard');
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
      {/* Top bar */}
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

      {/* Crumb strip */}
      <div className="border-b border-[var(--hairline)] bg-[var(--surface-0)]">
        <div className="max-w-7xl mx-auto px-6 py-2 text-mono-xs">
          <span className="text-[var(--amber)]">❯</span>{' '}
          <span className="text-[var(--ink-faint)]">console › overview</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="animate-fade-in-up">
          <h1 className="font-display text-lg mb-1">
            <span className="caret">{t('title')}</span>
          </h1>
          <div className="hairline my-4" />

          <div className="card p-8 text-sm">
            <div className="flex items-center gap-2 mb-2 text-[var(--ink-dim)]">
              <span className="status-dot dim" aria-hidden />
              <span className="text-mono-xs">{t('emptyStateTitle')}</span>
            </div>
            <p className="text-[var(--ink-faint)] text-sm max-w-prose">
              {t('emptyStateMessage')}
            </p>
          </div>

          {/* Placeholder grid — panels slot in here once built */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {(['clients', 'routes', 'permissions', 'rate-limits'] as const).map((key) => (
              <div
                key={key}
                className="card p-5 opacity-60"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-mono-xs">{key}</span>
                  <span className="status-dot dim" aria-hidden />
                </div>
                <div className="font-display text-lg text-[var(--ink-faint)]">—</div>
                <div className="text-mono-xs text-[var(--ink-disabled)] mt-1">not wired</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer status line */}
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

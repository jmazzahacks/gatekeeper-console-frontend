'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useAuth, logout } from '@/lib/useAuth';
import LanguageSwitcher from '@/components/LanguageSwitcher';

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
      <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6">
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--amber-glow)]/10 flex items-center justify-center">
            <div className="spinner border-[var(--amber-glow)] border-t-transparent" />
          </div>
          <p className="text-[var(--foreground-muted)] font-medium">{tCommon('loading')}</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen mesh-gradient paper-texture">
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 border-b border-[var(--border)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/dashboard" className="font-display text-xl font-bold">
              <span className="text-[var(--foreground)]">Gatekeeper</span>{' '}
              <span className="text-[var(--amber-glow)]">Console</span>
            </Link>

            <div className="flex items-center gap-4">
              {siteName && (
                <span className="text-sm text-[var(--foreground-muted)]">
                  {siteName}
                </span>
              )}
              <LanguageSwitcher />
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {tCommon('logout')}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 animate-fade-in-up">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
                {t('title')}
              </h1>
              <p className="text-[var(--foreground-muted)] text-lg">
                {t('subtitle')}
              </p>
            </div>

            {/* Placeholder content - replace with actual dashboard content */}
            <div className="card p-12 text-center animate-fade-in-up delay-200">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--amber-glow)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--amber-glow)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold mb-2">{t('emptyStateTitle')}</h2>
              <p className="text-[var(--foreground-muted)]">{t('emptyStateMessage')}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto text-center text-sm text-[var(--foreground-muted)]">
            <p className="font-display">
              <span className="text-[var(--foreground)]">Gatekeeper</span>{' '}
              <span className="text-[var(--amber-glow)]">Console</span>
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

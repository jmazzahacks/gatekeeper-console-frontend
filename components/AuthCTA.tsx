'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/useAuth';

export default function AuthCTA() {
  const tLogin = useTranslations('Login');
  const tDashboard = useTranslations('Dashboard');
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="inline-flex items-center justify-center w-auto px-10 py-4 text-lg">
        <div className="spinner border-[var(--amber-glow)] border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <Link href="/dashboard" className="btn-primary inline-flex w-auto px-10 py-4 text-lg">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        {tDashboard('goToDashboard')}
      </Link>
    );
  }

  return (
    <Link href="/login" className="btn-primary inline-flex w-auto px-10 py-4 text-lg">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
      {tLogin('signInButton')}
    </Link>
  );
}

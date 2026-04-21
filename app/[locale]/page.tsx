'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/useAuth';
import BrandMark from '@/components/BrandMark';

export default function RootGate() {
  const router = useRouter();
  const tCommon = useTranslations('Common');
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center animate-fade-in">
        <div className="mb-6">
          <BrandMark size="lg" />
        </div>
        <div className="flex items-center justify-center gap-3 text-mono-xs">
          <div className="spinner" />
          <span>{tCommon('loading')}</span>
        </div>
      </div>
    </main>
  );
}

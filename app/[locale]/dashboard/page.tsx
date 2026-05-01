'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import DashboardShell from '@/components/DashboardShell';

type Tile = {
  key: string;
  href: string | null;  // null = not wired yet
};

const TILES: Tile[] = [
  { key: 'clients', href: '/dashboard/clients' },
  { key: 'routes', href: '/dashboard/routes' },
  { key: 'permissions', href: null },
  { key: 'rate-limits', href: null },
];

export default function DashboardOverview() {
  const t = useTranslations('Dashboard');

  return (
    <DashboardShell crumb="console › overview">
      <div className="animate-fade-in-up">
        <h1 className="font-display text-lg mb-1">
          <span className="caret">{t('title')}</span>
        </h1>
        <div className="hairline my-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TILES.map((tile) => (
            tile.href ? (
              <Link
                key={tile.key}
                href={tile.href}
                className="card p-5 hover:border-[var(--amber)] transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-mono-xs">{tile.key}</span>
                  <span className="status-dot ok" aria-hidden />
                </div>
                <div className="font-display text-lg text-[var(--ink)]">open</div>
                <div className="text-mono-xs text-[var(--ink-faint)] mt-1">→</div>
              </Link>
            ) : (
              <div key={tile.key} className="card p-5 opacity-60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-mono-xs">{tile.key}</span>
                  <span className="status-dot dim" aria-hidden />
                </div>
                <div className="font-display text-lg text-[var(--ink-faint)]">—</div>
                <div className="text-mono-xs text-[var(--ink-disabled)] mt-1">not wired</div>
              </div>
            )
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

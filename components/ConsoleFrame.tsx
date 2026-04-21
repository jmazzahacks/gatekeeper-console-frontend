'use client';

import { ReactNode } from 'react';
import BrandMark from './BrandMark';

type Props = {
  children: ReactNode;
  /** Optional right-side header slot (e.g. language switcher, status dot) */
  headerRight?: ReactNode;
  /** Optional small label shown above the card — rendered as a terminal path crumb */
  crumb?: string;
  /** Optional footer metadata line under the card */
  footnote?: string;
};

/**
 * Full-screen terminal-style shell used by auth-facing pages.
 * Header bar (brand + optional right slot), centered content, hairline footer.
 */
export default function ConsoleFrame({ children, headerRight, crumb, footnote }: Props) {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--hairline)]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <BrandMark size="md" />
          <div className="flex items-center gap-3 text-mono-xs">
            {headerRight}
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {crumb ? (
            <div className="text-mono-xs mb-3 animate-fade-in">
              <span className="text-[var(--amber)]">❯</span>{' '}
              <span className="text-[var(--ink-faint)]">{crumb}</span>
            </div>
          ) : null}
          {children}
        </div>
      </div>

      <footer className="border-t border-[var(--hairline)]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between text-mono-xs">
          <span className="flex items-center gap-2">
            <span className="status-dot ok" aria-hidden />
            <span>online</span>
          </span>
          <span>{footnote ?? ''}</span>
        </div>
      </footer>
    </main>
  );
}

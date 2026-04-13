'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, Locale } from '@/i18n/routing';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  // Add more languages here as needed:
  // es: 'Espanol',
  // fr: 'Francais',
  // de: 'Deutsch',
  // pt: 'Portugues',
  // it: 'Italiano',
  // ja: '日本語',
  // zh: '中文',
  // ko: '한국어',
  // ar: 'العربية',
  // ru: 'Русский',
};

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function handleChange(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const currentLanguageName = LANGUAGE_NAMES[locale] || locale.toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors rounded-lg hover:bg-[var(--amber-glow)]/5"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <GlobeIcon />
        <span>{currentLanguageName}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-40 py-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg z-50"
          role="listbox"
          aria-label="Select language"
        >
          {routing.locales.map((loc) => {
            const isSelected = locale === loc;
            const languageName = LANGUAGE_NAMES[loc] || loc.toUpperCase();

            return (
              <button
                key={loc}
                onClick={() => handleChange(loc)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-[var(--amber-glow)]/10 text-[var(--amber-glow)] font-medium'
                    : 'text-[var(--foreground-muted)] hover:bg-[var(--amber-glow)]/5 hover:text-[var(--foreground)]'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                {languageName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

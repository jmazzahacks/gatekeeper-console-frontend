import { useTranslations } from 'next-intl';
import AuthCTA from '@/components/AuthCTA';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function HeroIcon() {
  return (
    <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--amber-glow)]/10 flex items-center justify-center">
      <svg className="w-8 h-8 text-[var(--amber-glow)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card p-6 text-left">
      <div className="w-10 h-10 rounded-lg bg-[var(--amber-glow)]/10 flex items-center justify-center text-[var(--amber-glow)] mb-4">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold mb-2">{title}</h3>
      <p className="text-[var(--foreground-muted)] text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations('Home');

  return (
    <main className="min-h-screen mesh-gradient paper-texture">
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="font-display text-xl font-bold">
              <span className="text-[var(--foreground)]">Gatekeeper</span>{' '}
              <span className="text-[var(--amber-glow)]">Console</span>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo/Icon */}
            <div className="animate-fade-in-up mb-8">
              <HeroIcon />
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up delay-100">
              <span className="text-[var(--foreground)]">Gatekeeper</span>{' '}
              <span className="text-[var(--amber-glow)]">Console</span>
            </h1>

            {/* Decorative line */}
            <div className="flex justify-center mb-6 animate-fade-in-up delay-200">
              <div className="decorative-line" />
            </div>

            {/* Subtitle */}
            <p className="font-display text-xl md:text-2xl text-[var(--foreground)] mb-4 animate-fade-in-up delay-200">
              {t('subtitle')}
            </p>

            {/* Description */}
            <p className="text-[var(--foreground-muted)] text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-fade-in-up delay-300">
              {t('description')}
            </p>

            {/* CTA Button */}
            <div className="animate-fade-in-up delay-400">
              <AuthCTA />
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="px-6 pb-16 md:pb-24">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="animate-fade-in-up delay-500">
                <FeatureCard
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  }
                  title={t('feature1Title')}
                  description={t('feature1Description')}
                />
              </div>
              <div className="animate-fade-in-up delay-600">
                <FeatureCard
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  }
                  title={t('feature2Title')}
                  description={t('feature2Description')}
                />
              </div>
              <div className="animate-fade-in-up delay-600" style={{ animationDelay: '700ms' }}>
                <FeatureCard
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                  title={t('feature3Title')}
                  description={t('feature3Description')}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-[var(--border)]">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--foreground-muted)]">
            <p className="font-display">
              <span className="text-[var(--foreground)]">Gatekeeper</span>{' '}
              <span className="text-[var(--amber-glow)]">Console</span>
            </p>
            <p>{t('footerTagline')}</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

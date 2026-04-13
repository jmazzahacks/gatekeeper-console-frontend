'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';

function SuccessCheckmark() {
  return (
    <div className="relative">
      {/* Animated rings */}
      <div className="absolute inset-0 rounded-full border-2 border-[var(--success-green)] animate-[pulse-ring_2s_ease-out_infinite]" />
      <div className="absolute inset-0 rounded-full border-2 border-[var(--success-green)] animate-[pulse-ring_2s_ease-out_infinite_0.5s]" />

      {/* Main circle */}
      <div className="relative w-24 h-24 rounded-full bg-[var(--success-green)]/10 flex items-center justify-center">
        <svg
          className="w-12 h-12 text-[var(--success-green)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
            className="animate-[draw_0.5s_ease-out_0.3s_forwards]"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
            }}
          />
        </svg>
      </div>
    </div>
  );
}

function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  useEffect(() => {
    const colors = ['var(--amber-glow)', 'var(--amber-bright)', 'var(--success-green)', 'var(--foreground-muted)'];
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-[confetti-fall_3s_ease-out_forwards]"
          style={{
            left: `${particle.x}%`,
            top: '-10px',
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function WelcomePage() {
  const t = useTranslations('Welcome');
  const tLogin = useTranslations('Login');
  const tCommon = useTranslations('Common');

  return (
    <main className="min-h-screen mesh-gradient paper-texture flex items-center justify-center p-6 overflow-hidden">
      {/* Confetti animation */}
      <Confetti />

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Success checkmark */}
        <div className="flex justify-center mb-8 animate-scale-in">
          <SuccessCheckmark />
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 animate-fade-in-up delay-200">
          {t('title')}
        </h1>

        {/* Decorative line */}
        <div className="flex justify-center mb-6 animate-fade-in-up delay-300">
          <div className="decorative-line" />
        </div>

        {/* Subtitle */}
        <p className="text-xl text-[var(--foreground)] mb-3 animate-fade-in-up delay-300">
          {t('subtitle')}
        </p>

        {/* Description */}
        <p className="text-[var(--foreground-muted)] text-lg mb-10 max-w-md mx-auto animate-fade-in-up delay-400">
          {t('description')}
        </p>

        {/* CTA Button */}
        <div className="animate-fade-in-up delay-500">
          <Link
            href="/login"
            className="btn-primary inline-flex w-auto px-10 py-4 text-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            {tLogin('signInButton')}
          </Link>
        </div>

        {/* Footer brand */}
        <p className="mt-16 text-sm text-[var(--foreground-muted)] animate-fade-in delay-600">
          <span className="font-display">
            <span className="text-[var(--foreground)]">Gatekeeper</span>{' '}
            <span className="text-[var(--amber-glow)]">Console</span>
          </span>
          {' '}&middot; {tCommon('readyToCreate')}
        </p>
      </div>

      {/* Add confetti animation keyframes via style tag */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0);
            opacity: 0;
          }
        }
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </main>
  );
}

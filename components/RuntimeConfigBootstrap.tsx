'use client';

import { useEffect, useState } from 'react';
import { fetchRuntimeConfig, setRuntimeConfig } from '@/lib/runtimeConfig';

type LoadState = 'loading' | 'ready' | 'error';

export default function RuntimeConfigBootstrap({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchRuntimeConfig()
      .then((cfg) => {
        if (!mounted) return;
        setRuntimeConfig(cfg);
        setState('ready');
      })
      .catch((e) => {
        if (!mounted) return;
        setErrorMessage(e instanceof Error ? e.message : String(e));
        setState('error');
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (state === 'error') {
    return (
      <div style={{ padding: 24, fontFamily: 'monospace' }}>
        Failed to load configuration from /api/config: {errorMessage}
      </div>
    );
  }

  if (state === 'loading') {
    return null;
  }

  return <>{children}</>;
}

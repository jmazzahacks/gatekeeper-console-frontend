'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Route } from '@jmazzahacks/api-gatekeeper-api';
import { GatekeeperApiError } from '@jmazzahacks/api-gatekeeper-api';
import DashboardShell from '@/components/DashboardShell';
import { getGatekeeperClient } from '@/lib/gatekeeperClient';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; routes: Route[] }
  | { status: 'error'; message: string };

function formatMethods(methods: Route['methods']): string[] {
  return Object.entries(methods).map(([method, auth]) => {
    if (!auth) return method;
    if (!auth.auth_required) return `${method} (public)`;
    return `${method} (${auth.auth_type})`;
  });
}

function RoutesTable({ routes }: { routes: Route[] }) {
  if (routes.length === 0) {
    return (
      <div className="card p-8 text-sm text-center">
        <div className="inline-flex items-center gap-2 text-[var(--ink-dim)]">
          <span className="status-dot dim" aria-hidden />
          <span className="text-mono-xs">no routes configured</span>
        </div>
        <p className="text-[var(--ink-faint)] mt-2">
          Run <code className="text-[var(--amber)]">scripts/create_route.py</code> to
          add one.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--hairline)] text-mono-xs text-left">
            <th className="px-4 py-3 font-normal">pattern</th>
            <th className="px-4 py-3 font-normal">domain</th>
            <th className="px-4 py-3 font-normal">service</th>
            <th className="px-4 py-3 font-normal">methods</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((route) => (
            <tr
              key={route.route_id}
              className="border-b border-[var(--hairline)] last:border-b-0 hover:bg-[var(--surface-1)]"
            >
              <td className="px-4 py-3 text-[var(--ink)]">{route.route_pattern}</td>
              <td className="px-4 py-3 text-[var(--ink-dim)]">{route.domain}</td>
              <td className="px-4 py-3 text-[var(--ink-dim)]">{route.service_name}</td>
              <td className="px-4 py-3 text-[var(--ink-dim)]">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {formatMethods(route.methods).map((m) => (
                    <span key={m} className="text-mono-xs">{m}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RoutesPage() {
  const tCommon = useTranslations('Common');
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = getGatekeeperClient();
        const routes = await client.listRoutes();
        if (!cancelled) setState({ status: 'ok', routes });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof GatekeeperApiError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Failed to load routes';
        setState({ status: 'error', message });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardShell crumb="console › routes">
      <div className="animate-fade-in-up">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="font-display text-lg">
            <span className="caret">routes</span>
          </h1>
          <span className="text-mono-xs text-[var(--ink-faint)]">
            {state.status === 'ok' ? `${state.routes.length} configured` : ''}
          </span>
        </div>
        <div className="hairline my-4" />

        {state.status === 'loading' && (
          <div className="flex items-center gap-3 text-mono-xs py-8">
            <div className="spinner" />
            <span>{tCommon('loading')}</span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="status-error">
            <div className="flex items-center gap-2">
              <span className="status-dot err" aria-hidden />
              <span>{state.message}</span>
            </div>
          </div>
        )}

        {state.status === 'ok' && <RoutesTable routes={state.routes} />}
      </div>
    </DashboardShell>
  );
}

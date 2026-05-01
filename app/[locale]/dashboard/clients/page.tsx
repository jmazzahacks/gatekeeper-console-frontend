'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ClientSummary } from '@jmazzahacks/api-gatekeeper-api';
import { GatekeeperApiError } from '@jmazzahacks/api-gatekeeper-api';
import DashboardShell from '@/components/DashboardShell';
import { getGatekeeperClient } from '@/lib/gatekeeperClient';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; clients: ClientSummary[] }
  | { status: 'error'; message: string };

function formatTimestamp(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toISOString().slice(0, 10);
}

function statusDotClass(status: ClientSummary['status']): string {
  switch (status) {
    case 'active': return 'ok';
    case 'suspended': return 'dim';
    case 'revoked': return 'err';
  }
}

function ClientsTable({ clients }: { clients: ClientSummary[] }) {
  if (clients.length === 0) {
    return (
      <div className="card p-8 text-sm text-center">
        <div className="inline-flex items-center gap-2 text-[var(--ink-dim)]">
          <span className="status-dot dim" aria-hidden />
          <span className="text-mono-xs">no clients configured</span>
        </div>
        <p className="text-[var(--ink-faint)] mt-2">
          Run <code className="text-[var(--amber)]">scripts/create_client.py</code> to
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
            <th className="px-4 py-3 font-normal">name</th>
            <th className="px-4 py-3 font-normal">api_key</th>
            <th className="px-4 py-3 font-normal">status</th>
            <th className="px-4 py-3 font-normal">created</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr
              key={c.client_id}
              className="border-b border-[var(--hairline)] last:border-b-0 hover:bg-[var(--surface-1)]"
            >
              <td className="px-4 py-3 text-[var(--ink)]">{c.client_name}</td>
              <td className="px-4 py-3 text-[var(--ink-dim)] font-mono text-mono-xs">
                {c.api_key_masked}
              </td>
              <td className="px-4 py-3 text-[var(--ink-dim)]">
                <span className="inline-flex items-center gap-2">
                  <span className={`status-dot ${statusDotClass(c.status)}`} aria-hidden />
                  <span className="text-mono-xs">{c.status}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--ink-faint)] text-mono-xs">
                {formatTimestamp(c.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ClientsPage() {
  const tCommon = useTranslations('Common');
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = getGatekeeperClient();
        const clients = await client.listClients();
        if (!cancelled) setState({ status: 'ok', clients });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof GatekeeperApiError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Failed to load clients';
        setState({ status: 'error', message });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardShell crumb="console › clients">
      <div className="animate-fade-in-up">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="font-display text-lg">
            <span className="caret">clients</span>
          </h1>
          <span className="text-mono-xs text-[var(--ink-faint)]">
            {state.status === 'ok' ? `${state.clients.length} configured` : ''}
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

        {state.status === 'ok' && <ClientsTable clients={state.clients} />}
      </div>
    </DashboardShell>
  );
}

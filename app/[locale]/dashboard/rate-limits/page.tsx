'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  ClientSummary,
  RateLimitPayload,
  RateLimitSummary,
} from '@jmazzahacks/api-gatekeeper-api';
import { GatekeeperApiError } from '@jmazzahacks/api-gatekeeper-api';
import DashboardShell from '@/components/DashboardShell';
import { getGatekeeperClient } from '@/lib/gatekeeperClient';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; rateLimits: RateLimitSummary[]; clients: ClientSummary[] }
  | { status: 'error'; message: string };

type EditorMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; rateLimit: RateLimitSummary };

function errorMessage(err: unknown): string {
  if (err instanceof GatekeeperApiError) return `${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'request failed';
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

function RateLimitsTable({
  rateLimits,
  onEdit,
  onDelete,
}: {
  rateLimits: RateLimitSummary[];
  onEdit: (rl: RateLimitSummary) => void;
  onDelete: (rl: RateLimitSummary) => void;
}) {
  if (rateLimits.length === 0) {
    return (
      <div className="card p-8 text-sm text-center">
        <div className="inline-flex items-center gap-2 text-[var(--ink-dim)]">
          <span className="status-dot dim" aria-hidden />
          <span className="text-mono-xs">no rate limits configured</span>
        </div>
        <p className="text-[var(--ink-faint)] mt-2">
          Click <span className="text-[var(--amber)]">+ new limit</span> above to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--hairline)] text-mono-xs text-left">
            <th className="px-4 py-3 font-normal">client</th>
            <th className="px-4 py-3 font-normal text-right">requests / day</th>
            <th className="px-4 py-3 font-normal">updated</th>
            <th className="px-4 py-3 font-normal text-right">actions</th>
          </tr>
        </thead>
        <tbody>
          {rateLimits.map((rl) => (
            <tr
              key={rl.client_id}
              className="border-b border-[var(--hairline)] last:border-b-0 hover:bg-[var(--surface-1)]"
            >
              <td className="px-4 py-3 text-[var(--ink)]">{rl.client_name}</td>
              <td className="px-4 py-3 text-[var(--ink-dim)] font-mono text-mono-xs text-right">
                {rl.requests_per_day.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-[var(--ink-faint)] font-mono text-mono-xs">
                {formatTimestamp(rl.updated_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-3 text-mono-xs">
                  <button
                    type="button"
                    onClick={() => onEdit(rl)}
                    className="text-[var(--ink-dim)] hover:text-[var(--amber)] transition-colors"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(rl)}
                    className="text-[var(--ink-dim)] hover:text-[var(--err)] transition-colors"
                  >
                    delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateRateLimitModal({
  unlimitedClients,
  onClose,
  onSaved,
}: {
  unlimitedClients: ClientSummary[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState<string>(unlimitedClients[0]?.client_id ?? '');
  const [requestsPerDay, setRequestsPerDay] = useState<string>('1000');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError('client is required');
      return;
    }
    const parsed = Number(requestsPerDay);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError('requests per day must be a positive integer');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: RateLimitPayload = { requests_per_day: parsed };
      await getGatekeeperClient().setRateLimit(clientId, payload);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit}>
          <div className="px-6 pt-6 pb-3 border-b border-[var(--hairline)]">
            <h2 className="font-display text-base">
              <span className="caret">new rate limit</span>
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">client</label>
              <select
                className="input-field"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {unlimitedClients.length === 0 ? (
                  <option value="">all clients have a limit set</option>
                ) : (
                  unlimitedClients.map((c) => (
                    <option key={c.client_id} value={c.client_id}>
                      {c.client_name} ({c.api_key_masked})
                    </option>
                  ))
                )}
              </select>
              <p className="text-mono-xs text-[var(--ink-faint)] mt-1">
                only clients without an existing limit are listed
              </p>
            </div>

            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                requests per day
              </label>
              <input
                type="number"
                min={1}
                step={1}
                className="input-field"
                value={requestsPerDay}
                onChange={(e) => setRequestsPerDay(e.target.value)}
              />
              <p className="text-mono-xs text-[var(--ink-faint)] mt-1">
                maximum requests in a rolling 24-hour window
              </p>
            </div>

            {error && (
              <div className="status-error">
                <div className="flex items-center gap-2">
                  <span className="status-dot err" aria-hidden />
                  <span className="text-mono-xs">{error}</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-3 border-t border-[var(--hairline)] flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || unlimitedClients.length === 0}
            >
              {submitting ? 'saving' : 'set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRateLimitModal({
  rateLimit,
  onClose,
  onSaved,
}: {
  rateLimit: RateLimitSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [requestsPerDay, setRequestsPerDay] = useState<string>(
    String(rateLimit.requests_per_day),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(requestsPerDay);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError('requests per day must be a positive integer');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: RateLimitPayload = { requests_per_day: parsed };
      await getGatekeeperClient().setRateLimit(rateLimit.client_id, payload);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit}>
          <div className="px-6 pt-6 pb-3 border-b border-[var(--hairline)]">
            <h2 className="font-display text-base">
              <span className="caret">edit rate limit</span>
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4 text-sm">
            <div>
              <span className="text-mono-xs text-[var(--ink-dim)]">client</span>
              <div className="text-[var(--ink)]">{rateLimit.client_name}</div>
            </div>

            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                requests per day
              </label>
              <input
                type="number"
                min={1}
                step={1}
                className="input-field"
                value={requestsPerDay}
                onChange={(e) => setRequestsPerDay(e.target.value)}
              />
              <p className="text-mono-xs text-[var(--ink-faint)] mt-1">
                maximum requests in a rolling 24-hour window
              </p>
            </div>

            {error && (
              <div className="status-error">
                <div className="flex items-center gap-2">
                  <span className="status-dot err" aria-hidden />
                  <span className="text-mono-xs">{error}</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-3 border-t border-[var(--hairline)] flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'saving' : 'save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({
  rateLimit,
  onCancel,
  onDeleted,
}: {
  rateLimit: RateLimitSummary | null;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [rateLimit?.client_id]);

  if (!rateLimit) return null;

  async function confirm() {
    if (!rateLimit) return;
    setSubmitting(true);
    setError(null);
    try {
      await getGatekeeperClient().deleteRateLimit(rateLimit.client_id);
      onDeleted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-3 border-b border-[var(--hairline)]">
          <h2 className="font-display text-base">
            <span className="caret">remove rate limit</span>
          </h2>
        </div>

        <div className="px-6 py-4 text-sm text-[var(--ink-dim)]">
          <p>
            Remove the rate limit on{' '}
            <code className="text-[var(--amber)]">{rateLimit.client_name}</code>?
          </p>
          <p className="text-mono-xs text-[var(--ink-faint)] mt-2">
            The client will fall back to the global default (if any) after removal.
          </p>

          {error && (
            <div className="status-error mt-3">
              <div className="flex items-center gap-2">
                <span className="status-dot err" aria-hidden />
                <span className="text-mono-xs">{error}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-[var(--hairline)] flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={confirm}
            disabled={submitting}
            style={{ background: 'var(--err)', borderColor: 'var(--err)' }}
          >
            {submitting ? 'removing' : 'remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RateLimitsPage() {
  const tCommon = useTranslations('Common');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [editor, setEditor] = useState<EditorMode>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<RateLimitSummary | null>(null);

  async function reload() {
    setState({ status: 'loading' });
    try {
      const c = getGatekeeperClient();
      const [rateLimits, clients] = await Promise.all([
        c.listRateLimits(),
        c.listClients(),
      ]);
      setState({ status: 'ok', rateLimits, clients });
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err) });
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const unlimitedClients = useMemo(() => {
    if (state.status !== 'ok') return [];
    const limitedIds = new Set(state.rateLimits.map((rl) => rl.client_id));
    return state.clients.filter((c) => !limitedIds.has(c.client_id));
  }, [state]);

  return (
    <DashboardShell crumb="console › rate-limits">
      <div className="animate-fade-in-up">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="font-display text-lg">
            <span className="caret">rate limits</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-mono-xs text-[var(--ink-faint)]">
              {state.status === 'ok' ? `${state.rateLimits.length} configured` : ''}
            </span>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setEditor({ kind: 'create' })}
              disabled={state.status === 'loading' || unlimitedClients.length === 0}
              title={
                state.status === 'ok' && unlimitedClients.length === 0
                  ? 'all clients have a rate limit set'
                  : undefined
              }
            >
              + new limit
            </button>
          </div>
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

        {state.status === 'ok' && (
          <RateLimitsTable
            rateLimits={state.rateLimits}
            onEdit={(rl) => setEditor({ kind: 'edit', rateLimit: rl })}
            onDelete={(rl) => setPendingDelete(rl)}
          />
        )}
      </div>

      {state.status === 'ok' && editor.kind === 'create' && (
        <CreateRateLimitModal
          unlimitedClients={unlimitedClients}
          onClose={() => setEditor({ kind: 'closed' })}
          onSaved={() => {
            setEditor({ kind: 'closed' });
            void reload();
          }}
        />
      )}

      {state.status === 'ok' && editor.kind === 'edit' && (
        <EditRateLimitModal
          rateLimit={editor.rateLimit}
          onClose={() => setEditor({ kind: 'closed' })}
          onSaved={() => {
            setEditor({ kind: 'closed' });
            void reload();
          }}
        />
      )}

      <DeleteConfirm
        rateLimit={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onDeleted={() => {
          setPendingDelete(null);
          void reload();
        }}
      />
    </DashboardShell>
  );
}

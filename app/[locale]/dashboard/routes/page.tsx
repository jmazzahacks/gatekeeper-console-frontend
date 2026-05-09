'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AuthType, HttpMethod, MethodAuth, Route, RoutePayload } from '@jmazzahacks/api-gatekeeper-api';
import { GatekeeperApiError } from '@jmazzahacks/api-gatekeeper-api';
import DashboardShell from '@/components/DashboardShell';
import { getGatekeeperClient } from '@/lib/gatekeeperClient';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; routes: Route[] }
  | { status: 'error'; message: string };

type FormState = {
  route_pattern: string;
  domain: string;
  service_name: string;
  methods: Partial<Record<HttpMethod, MethodAuth>>;
};

type EditorMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; route: Route };

const ALL_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

function emptyForm(): FormState {
  return {
    route_pattern: '',
    domain: '*',
    service_name: '',
    methods: { GET: { auth_required: false, auth_type: null } },
  };
}

function formFromRoute(route: Route): FormState {
  return {
    route_pattern: route.route_pattern,
    domain: route.domain,
    service_name: route.service_name,
    methods: { ...route.methods },
  };
}

function formatMethods(methods: Route['methods']): string[] {
  return Object.entries(methods).map(([method, auth]) => {
    if (!auth) return method;
    if (!auth.auth_required) return `${method} (public)`;
    return `${method} (${auth.auth_type})`;
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof GatekeeperApiError) return `${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'request failed';
}

function RoutesTable({
  routes,
  onEdit,
  onDelete,
}: {
  routes: Route[];
  onEdit: (r: Route) => void;
  onDelete: (r: Route) => void;
}) {
  if (routes.length === 0) {
    return (
      <div className="card p-8 text-sm text-center">
        <div className="inline-flex items-center gap-2 text-[var(--ink-dim)]">
          <span className="status-dot dim" aria-hidden />
          <span className="text-mono-xs">no routes configured</span>
        </div>
        <p className="text-[var(--ink-faint)] mt-2">
          Click <span className="text-[var(--amber)]">+ new route</span> above to add one.
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
            <th className="px-4 py-3 font-normal text-right">actions</th>
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
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-3 text-mono-xs">
                  <button
                    type="button"
                    onClick={() => onEdit(route)}
                    className="text-[var(--ink-dim)] hover:text-[var(--amber)] transition-colors"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(route)}
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

function MethodRow({
  method,
  config,
  onChange,
}: {
  method: HttpMethod;
  config: MethodAuth | undefined;
  onChange: (next: MethodAuth | undefined) => void;
}) {
  const enabled = config !== undefined;

  function setEnabled(next: boolean) {
    if (!next) {
      onChange(undefined);
      return;
    }
    onChange({ auth_required: false, auth_type: null });
  }

  function setAuthRequired(next: boolean) {
    if (!enabled) return;
    if (!next) {
      onChange({ auth_required: false, auth_type: null });
      return;
    }
    onChange({ auth_required: true, auth_type: 'api_key' });
  }

  function setAuthType(next: AuthType) {
    if (!enabled || !config?.auth_required) return;
    onChange({ auth_required: true, auth_type: next });
  }

  return (
    <div className="flex items-center gap-3 py-1.5 text-mono-xs">
      <label className="inline-flex items-center gap-2 w-20 shrink-0">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="accent-[var(--amber)]"
        />
        <span className={enabled ? 'text-[var(--ink)]' : 'text-[var(--ink-faint)]'}>
          {method}
        </span>
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled && (config?.auth_required ?? false)}
          disabled={!enabled}
          onChange={(e) => setAuthRequired(e.target.checked)}
          className="accent-[var(--amber)]"
        />
        <span className={enabled ? 'text-[var(--ink-dim)]' : 'text-[var(--ink-faint)]'}>
          auth required
        </span>
      </label>
      <select
        className="input-field max-w-[10rem]"
        value={config?.auth_required ? config.auth_type ?? 'api_key' : ''}
        disabled={!enabled || !config?.auth_required}
        onChange={(e) => setAuthType(e.target.value as AuthType)}
      >
        <option value="" disabled>
          —
        </option>
        <option value="api_key">api_key</option>
        <option value="hmac">hmac</option>
      </select>
    </div>
  );
}

function RouteEditor({
  mode,
  onClose,
  onSaved,
}: {
  mode: EditorMode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode.kind === 'create') {
      setForm(emptyForm());
      setError(null);
    } else if (mode.kind === 'edit') {
      setForm(formFromRoute(mode.route));
      setError(null);
    }
  }, [mode]);

  if (mode.kind === 'closed') return null;

  function setMethod(method: HttpMethod, next: MethodAuth | undefined) {
    setForm((prev) => {
      const methods = { ...prev.methods };
      if (next === undefined) {
        delete methods[method];
      } else {
        methods[method] = next;
      }
      return { ...prev, methods };
    });
  }

  function validate(): string | null {
    if (!form.route_pattern.trim()) return 'route_pattern is required';
    if (!form.route_pattern.startsWith('/')) return 'route_pattern must start with /';
    if (!form.domain.trim()) return 'domain is required';
    if (!form.service_name.trim()) return 'service_name is required';
    if (Object.keys(form.methods).length === 0) return 'at least one method must be configured';
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const payload: RoutePayload = {
        route_pattern: form.route_pattern.trim(),
        domain: form.domain.trim(),
        service_name: form.service_name.trim(),
        methods: form.methods,
      };
      const client = getGatekeeperClient();
      if (mode.kind === 'create') {
        await client.createRoute(payload);
      } else if (mode.kind === 'edit') {
        await client.updateRoute(mode.route.route_id, payload);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode.kind === 'create' ? 'new route' : 'edit route';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit}>
          <div className="px-6 pt-6 pb-3 border-b border-[var(--hairline)]">
            <h2 className="font-display text-base">
              <span className="caret">{title}</span>
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                route pattern
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="/api/users or /api/users/*"
                value={form.route_pattern}
                onChange={(e) => setForm({ ...form, route_pattern: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                domain
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="api.example.com or *"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                service name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="user-service"
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
              />
            </div>

            <div>
              <div className="text-mono-xs text-[var(--ink-dim)] mb-2">methods</div>
              <div className="border border-[var(--hairline)] rounded-sm px-3 py-2">
                {ALL_METHODS.map((m) => (
                  <MethodRow
                    key={m}
                    method={m}
                    config={form.methods[m]}
                    onChange={(next) => setMethod(m, next)}
                  />
                ))}
              </div>
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
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
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
  route,
  onCancel,
  onDeleted,
}: {
  route: Route | null;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [route?.route_id]);

  if (!route) return null;

  async function confirm() {
    if (!route) return;
    setSubmitting(true);
    setError(null);
    try {
      const client = getGatekeeperClient();
      await client.deleteRoute(route.route_id);
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
            <span className="caret">delete route</span>
          </h2>
        </div>

        <div className="px-6 py-4 text-sm text-[var(--ink-dim)]">
          <p>
            Permanently delete{' '}
            <code className="text-[var(--amber)]">{route.route_pattern}</code> on{' '}
            <code className="text-[var(--amber)]">{route.domain}</code>?
          </p>
          <p className="text-mono-xs text-[var(--ink-faint)] mt-2">
            Any client permissions referencing this route will also be removed (cascade).
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
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={confirm}
            disabled={submitting}
            style={{
              background: 'var(--err)',
              borderColor: 'var(--err)',
            }}
          >
            {submitting ? 'deleting' : 'delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoutesPage() {
  const tCommon = useTranslations('Common');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [editor, setEditor] = useState<EditorMode>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<Route | null>(null);

  async function reload() {
    setState({ status: 'loading' });
    try {
      const client = getGatekeeperClient();
      const routes = await client.listRoutes();
      setState({ status: 'ok', routes });
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err) });
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <DashboardShell crumb="console › routes">
      <div className="animate-fade-in-up">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="font-display text-lg">
            <span className="caret">routes</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-mono-xs text-[var(--ink-faint)]">
              {state.status === 'ok' ? `${state.routes.length} configured` : ''}
            </span>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setEditor({ kind: 'create' })}
              disabled={state.status === 'loading'}
            >
              + new route
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
          <RoutesTable
            routes={state.routes}
            onEdit={(r) => setEditor({ kind: 'edit', route: r })}
            onDelete={(r) => setPendingDelete(r)}
          />
        )}
      </div>

      <RouteEditor
        mode={editor}
        onClose={() => setEditor({ kind: 'closed' })}
        onSaved={() => {
          setEditor({ kind: 'closed' });
          void reload();
        }}
      />

      <DeleteConfirm
        route={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onDeleted={() => {
          setPendingDelete(null);
          void reload();
        }}
      />
    </DashboardShell>
  );
}

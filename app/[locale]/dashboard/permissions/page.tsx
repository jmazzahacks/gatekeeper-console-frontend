'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  ClientSummary,
  HttpMethod,
  PermissionCreatePayload,
  PermissionSummary,
  PermissionUpdatePayload,
  Route,
} from '@jmazzahacks/api-gatekeeper-api';
import { GatekeeperApiError } from '@jmazzahacks/api-gatekeeper-api';
import DashboardShell from '@/components/DashboardShell';
import { getGatekeeperClient } from '@/lib/gatekeeperClient';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; permissions: PermissionSummary[]; clients: ClientSummary[]; routes: Route[] }
  | { status: 'error'; message: string };

type EditorMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; permission: PermissionSummary };

function errorMessage(err: unknown): string {
  if (err instanceof GatekeeperApiError) return `${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'request failed';
}

function routeMethods(route: Route): HttpMethod[] {
  return Object.keys(route.methods) as HttpMethod[];
}

function PermissionsTable({
  permissions,
  onEdit,
  onDelete,
}: {
  permissions: PermissionSummary[];
  onEdit: (p: PermissionSummary) => void;
  onDelete: (p: PermissionSummary) => void;
}) {
  if (permissions.length === 0) {
    return (
      <div className="card p-8 text-sm text-center">
        <div className="inline-flex items-center gap-2 text-[var(--ink-dim)]">
          <span className="status-dot dim" aria-hidden />
          <span className="text-mono-xs">no permissions configured</span>
        </div>
        <p className="text-[var(--ink-faint)] mt-2">
          Click <span className="text-[var(--amber)]">+ new permission</span> above to add one.
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
            <th className="px-4 py-3 font-normal">route</th>
            <th className="px-4 py-3 font-normal">domain</th>
            <th className="px-4 py-3 font-normal">methods</th>
            <th className="px-4 py-3 font-normal text-right">actions</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr
              key={p.permission_id}
              className="border-b border-[var(--hairline)] last:border-b-0 hover:bg-[var(--surface-1)]"
            >
              <td className="px-4 py-3 text-[var(--ink)]">{p.client_name}</td>
              <td className="px-4 py-3 text-[var(--ink-dim)] font-mono text-mono-xs">
                {p.route_pattern}
              </td>
              <td className="px-4 py-3 text-[var(--ink-dim)] font-mono text-mono-xs">
                {p.route_domain}
              </td>
              <td className="px-4 py-3 text-[var(--ink-dim)]">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {p.allowed_methods.map((m) => (
                    <span key={m} className="text-mono-xs">{m}</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-3 text-mono-xs">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="text-[var(--ink-dim)] hover:text-[var(--amber)] transition-colors"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
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

function MethodCheckboxes({
  available,
  selected,
  onChange,
}: {
  available: HttpMethod[];
  selected: HttpMethod[];
  onChange: (next: HttpMethod[]) => void;
}) {
  function toggle(method: HttpMethod) {
    if (selected.includes(method)) {
      onChange(selected.filter((m) => m !== method));
    } else {
      onChange([...selected, method]);
    }
  }

  if (available.length === 0) {
    return (
      <p className="text-mono-xs text-[var(--ink-faint)]">
        the selected route has no methods configured
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-mono-xs">
      {available.map((m) => (
        <label key={m} className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.includes(m)}
            onChange={() => toggle(m)}
            className="accent-[var(--amber)]"
          />
          <span className={selected.includes(m) ? 'text-[var(--ink)]' : 'text-[var(--ink-faint)]'}>
            {m}
          </span>
        </label>
      ))}
    </div>
  );
}

function CreatePermissionModal({
  clients,
  routes,
  onClose,
  onSaved,
}: {
  clients: ClientSummary[];
  routes: Route[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState<string>(clients[0]?.client_id ?? '');
  const [routeId, setRouteId] = useState<string>(routes[0]?.route_id ?? '');
  const [methods, setMethods] = useState<HttpMethod[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.route_id === routeId) ?? null,
    [routes, routeId],
  );
  const availableMethods = useMemo(
    () => (selectedRoute ? routeMethods(selectedRoute) : []),
    [selectedRoute],
  );

  // Drop method selections that aren't valid for the newly-picked route.
  useEffect(() => {
    setMethods((prev) => prev.filter((m) => availableMethods.includes(m)));
  }, [routeId, availableMethods]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError('client is required');
      return;
    }
    if (!routeId) {
      setError('route is required');
      return;
    }
    if (methods.length === 0) {
      setError('at least one method must be selected');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: PermissionCreatePayload = {
        client_id: clientId,
        route_id: routeId,
        allowed_methods: methods,
      };
      await getGatekeeperClient().createPermission(payload);
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
        className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit}>
          <div className="px-6 pt-6 pb-3 border-b border-[var(--hairline)]">
            <h2 className="font-display text-base">
              <span className="caret">new permission</span>
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
                {clients.length === 0 ? (
                  <option value="">no clients configured</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.client_id} value={c.client_id}>
                      {c.client_name} ({c.api_key_masked})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">route</label>
              <select
                className="input-field"
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
              >
                {routes.length === 0 ? (
                  <option value="">no routes configured</option>
                ) : (
                  routes.map((r) => (
                    <option key={r.route_id} value={r.route_id}>
                      {r.route_pattern} @ {r.domain}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                allowed methods
              </label>
              <div className="border border-[var(--hairline)] px-3 py-2">
                <MethodCheckboxes
                  available={availableMethods}
                  selected={methods}
                  onChange={setMethods}
                />
              </div>
              <p className="text-mono-xs text-[var(--ink-faint)] mt-1">
                only methods configured on the selected route are shown
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
              disabled={submitting || clients.length === 0 || routes.length === 0}
            >
              {submitting ? 'granting' : 'grant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPermissionModal({
  permission,
  routes,
  onClose,
  onSaved,
}: {
  permission: PermissionSummary;
  routes: Route[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [methods, setMethods] = useState<HttpMethod[]>(permission.allowed_methods);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const route = useMemo(
    () => routes.find((r) => r.route_id === permission.route_id) ?? null,
    [routes, permission.route_id],
  );
  // Union of the route's configured methods + any methods the permission
  // already grants. Without the union, a permission that grants a method the
  // route no longer has would silently lose that grant on save.
  const availableMethods = useMemo(() => {
    const fromRoute = route ? routeMethods(route) : [];
    const merged = new Set<HttpMethod>([...fromRoute, ...permission.allowed_methods]);
    return Array.from(merged);
  }, [route, permission.allowed_methods]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (methods.length === 0) {
      setError('at least one method must be selected');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: PermissionUpdatePayload = { allowed_methods: methods };
      await getGatekeeperClient().updatePermission(permission.permission_id, payload);
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
              <span className="caret">edit permission</span>
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4 text-sm">
            <div>
              <span className="text-mono-xs text-[var(--ink-dim)]">client</span>
              <div className="text-[var(--ink)]">{permission.client_name}</div>
            </div>
            <div>
              <span className="text-mono-xs text-[var(--ink-dim)]">route</span>
              <div className="text-[var(--ink-dim)] font-mono text-mono-xs">
                {permission.route_pattern} @ {permission.route_domain}
              </div>
            </div>

            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                allowed methods
              </label>
              <div className="border border-[var(--hairline)] px-3 py-2">
                <MethodCheckboxes
                  available={availableMethods}
                  selected={methods}
                  onChange={setMethods}
                />
              </div>
            </div>

            <p className="text-mono-xs text-[var(--ink-faint)]">
              client and route are immutable. To change those, delete and re-create.
            </p>

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
  permission,
  onCancel,
  onDeleted,
}: {
  permission: PermissionSummary | null;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [permission?.permission_id]);

  if (!permission) return null;

  async function confirm() {
    if (!permission) return;
    setSubmitting(true);
    setError(null);
    try {
      await getGatekeeperClient().deletePermission(permission.permission_id);
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
            <span className="caret">revoke permission</span>
          </h2>
        </div>

        <div className="px-6 py-4 text-sm text-[var(--ink-dim)]">
          <p>
            Revoke <code className="text-[var(--amber)]">{permission.client_name}</code>'s access
            to{' '}
            <code className="text-[var(--amber)]">{permission.route_pattern}</code> on{' '}
            <code className="text-[var(--amber)]">{permission.route_domain}</code>?
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
            {submitting ? 'revoking' : 'revoke'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PermissionsPage() {
  const tCommon = useTranslations('Common');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [editor, setEditor] = useState<EditorMode>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<PermissionSummary | null>(null);

  async function reload() {
    setState({ status: 'loading' });
    try {
      const c = getGatekeeperClient();
      const [permissions, clients, routes] = await Promise.all([
        c.listPermissions(),
        c.listClients(),
        c.listRoutes(),
      ]);
      setState({ status: 'ok', permissions, clients, routes });
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err) });
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <DashboardShell crumb="console › permissions">
      <div className="animate-fade-in-up">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="font-display text-lg">
            <span className="caret">permissions</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-mono-xs text-[var(--ink-faint)]">
              {state.status === 'ok' ? `${state.permissions.length} configured` : ''}
            </span>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setEditor({ kind: 'create' })}
              disabled={state.status === 'loading'}
            >
              + new permission
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
          <PermissionsTable
            permissions={state.permissions}
            onEdit={(p) => setEditor({ kind: 'edit', permission: p })}
            onDelete={(p) => setPendingDelete(p)}
          />
        )}
      </div>

      {state.status === 'ok' && editor.kind === 'create' && (
        <CreatePermissionModal
          clients={state.clients}
          routes={state.routes}
          onClose={() => setEditor({ kind: 'closed' })}
          onSaved={() => {
            setEditor({ kind: 'closed' });
            void reload();
          }}
        />
      )}

      {state.status === 'ok' && editor.kind === 'edit' && (
        <EditPermissionModal
          permission={editor.permission}
          routes={state.routes}
          onClose={() => setEditor({ kind: 'closed' })}
          onSaved={() => {
            setEditor({ kind: 'closed' });
            void reload();
          }}
        />
      )}

      <DeleteConfirm
        permission={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onDeleted={() => {
          setPendingDelete(null);
          void reload();
        }}
      />
    </DashboardShell>
  );
}

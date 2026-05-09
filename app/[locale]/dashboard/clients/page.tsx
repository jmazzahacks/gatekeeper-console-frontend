'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  ClientCreated,
  ClientCreatePayload,
  ClientStatus,
  ClientSummary,
  ClientUpdatePayload,
  CredentialSpec,
} from '@jmazzahacks/api-gatekeeper-api';
import { GatekeeperApiError } from '@jmazzahacks/api-gatekeeper-api';
import DashboardShell from '@/components/DashboardShell';
import { getGatekeeperClient } from '@/lib/gatekeeperClient';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; clients: ClientSummary[] }
  | { status: 'error'; message: string };

type CredentialMode = 'none' | 'generate' | 'custom';

type CreateForm = {
  client_name: string;
  api_key_mode: CredentialMode;
  api_key_custom: string;
  shared_secret_mode: CredentialMode;
  shared_secret_custom: string;
};

type EditForm = {
  client_name: string;
  status: ClientStatus;
};

type EditorMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'created'; created: ClientCreated }
  | { kind: 'edit'; client: ClientSummary };

function emptyCreateForm(): CreateForm {
  return {
    client_name: '',
    api_key_mode: 'generate',
    api_key_custom: '',
    shared_secret_mode: 'none',
    shared_secret_custom: '',
  };
}

function editFormFrom(client: ClientSummary): EditForm {
  return { client_name: client.client_name, status: client.status };
}

function credentialSpecFromForm(mode: CredentialMode, custom: string): CredentialSpec {
  if (mode === 'none') return null;
  if (mode === 'generate') return { generate: true };
  return { value: custom };
}

function formatTimestamp(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toISOString().slice(0, 10);
}

function statusDotClass(status: ClientStatus): string {
  switch (status) {
    case 'active': return 'ok';
    case 'suspended': return 'dim';
    case 'revoked': return 'err';
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof GatekeeperApiError) return `${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'request failed';
}

function ClientsTable({
  clients,
  onEdit,
  onDelete,
}: {
  clients: ClientSummary[];
  onEdit: (c: ClientSummary) => void;
  onDelete: (c: ClientSummary) => void;
}) {
  if (clients.length === 0) {
    return (
      <div className="card p-8 text-sm text-center">
        <div className="inline-flex items-center gap-2 text-[var(--ink-dim)]">
          <span className="status-dot dim" aria-hidden />
          <span className="text-mono-xs">no clients configured</span>
        </div>
        <p className="text-[var(--ink-faint)] mt-2">
          Click <span className="text-[var(--amber)]">+ new client</span> above to add one.
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
            <th className="px-4 py-3 font-normal text-right">actions</th>
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
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-3 text-mono-xs">
                  <button
                    type="button"
                    onClick={() => onEdit(c)}
                    className="text-[var(--ink-dim)] hover:text-[var(--amber)] transition-colors"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(c)}
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

function CredentialField({
  label,
  mode,
  custom,
  onModeChange,
  onCustomChange,
}: {
  label: string;
  mode: CredentialMode;
  custom: string;
  onModeChange: (next: CredentialMode) => void;
  onCustomChange: (next: string) => void;
}) {
  return (
    <div>
      <div className="text-mono-xs text-[var(--ink-dim)] mb-1">{label}</div>
      <div className="flex gap-4 text-mono-xs mb-2">
        {(['none', 'generate', 'custom'] as CredentialMode[]).map((m) => (
          <label key={m} className="inline-flex items-center gap-2">
            <input
              type="radio"
              checked={mode === m}
              onChange={() => onModeChange(m)}
              className="accent-[var(--amber)]"
            />
            <span className={mode === m ? 'text-[var(--ink)]' : 'text-[var(--ink-faint)]'}>
              {m === 'generate' ? 'auto-generate' : m}
            </span>
          </label>
        ))}
      </div>
      {mode === 'custom' && (
        <input
          type="text"
          className="input-field"
          placeholder={`paste ${label} value`}
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
        />
      )}
    </div>
  );
}

function CreateClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (created: ClientCreated) => void;
}) {
  const [form, setForm] = useState<CreateForm>(emptyCreateForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!form.client_name.trim()) return 'client_name is required';
    if (form.api_key_mode === 'custom' && !form.api_key_custom.trim()) {
      return 'custom api_key value is required';
    }
    if (form.shared_secret_mode === 'custom' && !form.shared_secret_custom.trim()) {
      return 'custom shared_secret value is required';
    }
    if (form.api_key_mode === 'none' && form.shared_secret_mode === 'none') {
      return 'at least one of api_key or shared_secret must be configured';
    }
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
      const payload: ClientCreatePayload = {
        client_name: form.client_name.trim(),
        api_key: credentialSpecFromForm(form.api_key_mode, form.api_key_custom.trim()),
        shared_secret: credentialSpecFromForm(
          form.shared_secret_mode,
          form.shared_secret_custom.trim(),
        ),
      };
      const created = await getGatekeeperClient().createClient(payload);
      onCreated(created);
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
              <span className="caret">new client</span>
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                client name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="mobile-app, billing-service, ..."
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              />
            </div>

            <CredentialField
              label="api_key"
              mode={form.api_key_mode}
              custom={form.api_key_custom}
              onModeChange={(m) => setForm({ ...form, api_key_mode: m })}
              onCustomChange={(v) => setForm({ ...form, api_key_custom: v })}
            />

            <CredentialField
              label="shared_secret"
              mode={form.shared_secret_mode}
              custom={form.shared_secret_custom}
              onModeChange={(m) => setForm({ ...form, shared_secret_mode: m })}
              onCustomChange={(v) => setForm({ ...form, shared_secret_custom: v })}
            />

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
              {submitting ? 'creating' : 'create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CopyableSecret({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — user can still select manually
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-mono-xs text-[var(--ink-dim)]">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="text-mono-xs text-[var(--ink-dim)] hover:text-[var(--amber)] transition-colors"
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <code className="block text-mono-xs text-[var(--amber)] bg-[var(--surface-1)] border border-[var(--hairline)] px-3 py-2 break-all select-all">
        {value}
      </code>
    </div>
  );
}

function CreatedClientModal({
  created,
  onClose,
}: {
  created: ClientCreated;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-3 border-b border-[var(--hairline)]">
          <h2 className="font-display text-base">
            <span className="caret">credentials issued</span>
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4 text-sm">
          <div className="status-error">
            <div className="flex items-center gap-2">
              <span className="status-dot err" aria-hidden />
              <span className="text-mono-xs">
                save these now — they cannot be retrieved later
              </span>
            </div>
          </div>

          <div>
            <span className="text-mono-xs text-[var(--ink-dim)]">client_name</span>
            <div className="text-[var(--ink)]">{created.client_name}</div>
          </div>

          <div>
            <span className="text-mono-xs text-[var(--ink-dim)]">client_id</span>
            <code className="block text-mono-xs text-[var(--ink-dim)]">{created.client_id}</code>
          </div>

          {created.api_key && <CopyableSecret label="api_key" value={created.api_key} />}
          {created.shared_secret && (
            <CopyableSecret label="shared_secret" value={created.shared_secret} />
          )}
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-[var(--hairline)] flex justify-end">
          <button type="button" className="btn-primary" onClick={onClose}>
            done
          </button>
        </div>
      </div>
    </div>
  );
}

function EditClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: ClientSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditForm>(() => editFormFrom(client));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_name.trim()) {
      setError('client_name is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: ClientUpdatePayload = {
        client_name: form.client_name.trim(),
        status: form.status,
      };
      await getGatekeeperClient().updateClient(client.client_id, payload);
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
              <span className="caret">edit client</span>
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                client name
              </label>
              <input
                type="text"
                className="input-field"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-mono-xs text-[var(--ink-dim)] mb-1">
                status
              </label>
              <select
                className="input-field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
              >
                <option value="active">active</option>
                <option value="suspended">suspended</option>
                <option value="revoked">revoked</option>
              </select>
            </div>

            <p className="text-mono-xs text-[var(--ink-faint)]">
              api_key and shared_secret are immutable. To rotate, delete and recreate.
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
  client,
  onCancel,
  onDeleted,
}: {
  client: ClientSummary | null;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [client?.client_id]);

  if (!client) return null;

  async function confirm() {
    if (!client) return;
    setSubmitting(true);
    setError(null);
    try {
      await getGatekeeperClient().deleteClient(client.client_id);
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
            <span className="caret">delete client</span>
          </h2>
        </div>

        <div className="px-6 py-4 text-sm text-[var(--ink-dim)]">
          <p>
            Permanently delete <code className="text-[var(--amber)]">{client.client_name}</code>?
          </p>
          <p className="text-mono-xs text-[var(--ink-faint)] mt-2">
            All permissions granted to this client will also be removed (cascade).
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
            {submitting ? 'deleting' : 'delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const tCommon = useTranslations('Common');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [editor, setEditor] = useState<EditorMode>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<ClientSummary | null>(null);

  async function reload() {
    setState({ status: 'loading' });
    try {
      const clients = await getGatekeeperClient().listClients();
      setState({ status: 'ok', clients });
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err) });
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <DashboardShell crumb="console › clients">
      <div className="animate-fade-in-up">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="font-display text-lg">
            <span className="caret">clients</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-mono-xs text-[var(--ink-faint)]">
              {state.status === 'ok' ? `${state.clients.length} configured` : ''}
            </span>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setEditor({ kind: 'create' })}
              disabled={state.status === 'loading'}
            >
              + new client
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
          <ClientsTable
            clients={state.clients}
            onEdit={(c) => setEditor({ kind: 'edit', client: c })}
            onDelete={(c) => setPendingDelete(c)}
          />
        )}
      </div>

      {editor.kind === 'create' && (
        <CreateClientModal
          onClose={() => setEditor({ kind: 'closed' })}
          onCreated={(created) => setEditor({ kind: 'created', created })}
        />
      )}

      {editor.kind === 'created' && (
        <CreatedClientModal
          created={editor.created}
          onClose={() => {
            setEditor({ kind: 'closed' });
            void reload();
          }}
        />
      )}

      {editor.kind === 'edit' && (
        <EditClientModal
          client={editor.client}
          onClose={() => setEditor({ kind: 'closed' })}
          onSaved={() => {
            setEditor({ kind: 'closed' });
            void reload();
          }}
        />
      )}

      <DeleteConfirm
        client={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onDeleted={() => {
          setPendingDelete(null);
          void reload();
        }}
      />
    </DashboardShell>
  );
}

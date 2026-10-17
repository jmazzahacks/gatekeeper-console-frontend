'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClientSummary, HttpMethod, PermissionSummary, Route } from '@jmazzahacks/api-gatekeeper-api';
import { GatekeeperApiError } from '@jmazzahacks/api-gatekeeper-api';
import DashboardShell from '@/components/DashboardShell';
import { Link, useRouter } from '@/i18n/navigation';
import { getGatekeeperClient } from '@/lib/gatekeeperClient';

type Data = { clients: ClientSummary[]; routes: Route[]; permissions: PermissionSummary[] };
type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: Data };

function errorMessage(error: unknown): string {
  if (error instanceof GatekeeperApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : 'Request failed';
}

export default function NewPermissionPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  async function load() {
    setState({ status: 'loading' });
    try {
      const api = getGatekeeperClient();
      const [clients, routes, permissions] = await Promise.all([
        api.listClients(), api.listRoutes(), api.listPermissions(),
      ]);
      setState({ status: 'ok', data: { clients, routes, permissions } });
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) });
    }
  }

  useEffect(function loadOnMount() { void load(); }, []);

  return (
    <DashboardShell crumb="console › permissions › new">
      <div className="animate-fade-in-up">
        <Link href="/dashboard/permissions" className="text-mono-xs text-[var(--amber)]">← permissions</Link>
        <h1 className="font-display text-lg mt-4"><span className="caret">new permission</span></h1>
        <p className="text-sm text-[var(--ink-dim)] mt-2">Choose a client, find a route, and select the methods to grant.</p>
        <div className="hairline my-4" />
        {state.status === 'loading' && <p role="status" className="text-mono-xs py-8">loading clients and routes…</p>}
        {state.status === 'error' && (
          <div className="status-error" role="alert">
            <p>{state.message}</p>
            <button type="button" className="btn-secondary mt-3" onClick={load}>retry</button>
          </div>
        )}
        {state.status === 'ok' && <PermissionForm data={state.data} />}
      </div>
    </DashboardShell>
  );
}

function PermissionForm({ data }: { data: Data }) {
  const router = useRouter();
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const [routeId, setRouteId] = useState('');
  const [methods, setMethods] = useState<HttpMethod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const selectedClient = data.clients.find(function findClient(client) { return client.client_id === clientId; });
  const selectedRoute = data.routes.find(function findRoute(route) { return route.route_id === routeId; });
  const domains = useMemo(function domainOptions() {
    return [...new Set(data.routes.map(function routeDomain(route) { return route.domain; }))].sort();
  }, [data.routes]);
  const grantedRoutes = useMemo(function existingGrants() {
    return new Set(data.permissions.filter(function forClient(permission) {
      return permission.client_id === clientId;
    }).map(function grantedRoute(permission) { return permission.route_id; }));
  }, [data.permissions, clientId]);
  const visibleClients = data.clients.filter(function matchesClient(client) {
    return client.client_id === clientId || `${client.client_name} ${client.client_id}`.toLowerCase().includes(clientSearch.trim().toLowerCase());
  });
  const visibleRoutes = data.routes.filter(function matchesRoute(route) {
    return (!domain || route.domain === domain) &&
      `${route.route_pattern} ${route.domain} ${route.service_name}`.toLowerCase().includes(routeSearch.trim().toLowerCase());
  });
  const availableMethods = selectedRoute ? Object.keys(selectedRoute.methods) as HttpMethod[] : [];
  const canGrant = !!selectedClient && !!selectedRoute && !grantedRoutes.has(routeId) && methods.length > 0 &&
    methods.every(function validMethod(method) { return availableMethods.includes(method); });

  function chooseRoute(id: string) {
    setRouteId(id);
    setMethods([]);
    setError(null);
  }

  function toggleMethod(method: HttpMethod) {
    setMethods(function toggle(previous) {
      return previous.includes(method) ? previous.filter(function keep(value) { return value !== method; }) : [...previous, method];
    });
  }

  function preventSearchSubmit(event: React.KeyboardEvent<HTMLInputElement>) {
    // Searching must never grant the current selection through implicit submit.
    if (event.key === 'Enter') event.preventDefault();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!canGrant) {
      setError('Choose a client, a route without an existing grant, and at least one method.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await getGatekeeperClient().createPermission({ client_id: clientId, route_id: routeId, allowed_methods: methods });
      router.push('/dashboard/permissions');
    } catch (error) {
      setError(errorMessage(error));
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={submitting} className="min-w-0 space-y-6">
        <section className="card p-4 sm:p-6" aria-labelledby="client-heading">
          <h2 id="client-heading" className="font-display mb-4">1. Choose a client</h2>
          {data.clients.length === 0 ? (
            <p className="text-sm">No clients configured. <Link href="/dashboard/clients" className="text-[var(--amber)]">Add a client first.</Link></p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="client-search" className="block text-mono-xs mb-1">search clients</label>
                <input id="client-search" type="search" onKeyDown={preventSearchSubmit} className="input-field" placeholder="Name or client ID" value={clientSearch} onChange={function searchClients(event) { setClientSearch(event.target.value); }} />
              </div>
              <div className="min-w-0">
                <label htmlFor="permission-client" className="block text-mono-xs mb-1">client</label>
                <select id="permission-client" className="input-field" value={clientId} onChange={function changeClient(event) { setClientId(event.target.value); chooseRoute(''); }}>
                  <option value="">choose a client</option>
                  {visibleClients.map(function clientOption(client) {
                    return <option key={client.client_id} value={client.client_id}>{client.client_name} ({client.api_key_masked})</option>;
                  })}
                </select>
                {visibleClients.length === 0 && <p className="text-sm mt-2">No clients match your search.</p>}
              </div>
            </div>
          )}
        </section>

        <section className="card p-4 sm:p-6" aria-labelledby="route-heading">
          <h2 id="route-heading" className="font-display mb-4">2. Find a route</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label htmlFor="route-domain" className="block text-mono-xs mb-1">domain</label>
              <select id="route-domain" className="input-field" value={domain} onChange={function changeDomain(event) { setDomain(event.target.value); }}>
                <option value="">all domains</option>
                {domains.map(function domainOption(value) { return <option key={value} value={value}>{value}</option>; })}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="route-search" className="block text-mono-xs mb-1">search routes</label>
              <input id="route-search" type="search" onKeyDown={preventSearchSubmit} className="input-field" placeholder="Path, service, or domain" value={routeSearch} onChange={function searchRoutes(event) { setRouteSearch(event.target.value); }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 my-4">
            <p role="status" className="text-mono-xs text-[var(--ink-dim)]">showing {visibleRoutes.length} of {data.routes.length} routes</p>
            {(domain || routeSearch) && <button type="button" className="btn-secondary" onClick={function clearFilters() { setDomain(''); setRouteSearch(''); }}>clear filters</button>}
          </div>
          {!clientId && <p className="text-sm text-[var(--ink-dim)] mb-3">Choose a client to select a route.</p>}
          {data.routes.length === 0 ? (
            <p className="text-sm">No routes configured. <Link href="/dashboard/routes" className="text-[var(--amber)]">Add a route first.</Link></p>
          ) : visibleRoutes.length === 0 ? (
            <p className="text-sm py-4">No routes match these filters. Clear the filters or try another search.</p>
          ) : (
            <fieldset className="min-w-0 max-h-96 overflow-y-auto border border-[var(--hairline)]">
              <legend className="sr-only">route</legend>
              {visibleRoutes.map(function routeChoice(route) {
                const granted = grantedRoutes.has(route.route_id);
                const noMethods = Object.keys(route.methods).length === 0;
                return (
                  <label key={route.route_id} className={`flex items-start gap-3 p-4 border-b border-[var(--hairline)] last:border-b-0 ${routeId === route.route_id ? 'bg-[var(--surface-1)]' : ''}`}>
                    <input type="radio" name="route" value={route.route_id} checked={routeId === route.route_id} disabled={!clientId || granted || noMethods} onChange={function selectRoute() { chooseRoute(route.route_id); }} className="mt-1 accent-[var(--amber)]" />
                    <span className="min-w-0 text-sm break-all">
                      <span className="block font-mono text-[var(--ink)]">{route.route_pattern}</span>
                      <span className="block text-[var(--ink-dim)]">{route.domain} · {route.service_name}</span>
                      <span className="block text-mono-xs mt-1 text-[var(--ink-faint)]">{Object.keys(route.methods).join(', ')}{granted ? ' · already granted' : noMethods ? 'no methods configured' : ''}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {clientId && grantedRoutes.size > 0 && <p className="text-sm text-[var(--ink-dim)] mt-3">Already-granted routes are unavailable here. Edit their methods on the permissions screen.</p>}
        </section>

        <section className="card p-4 sm:p-6" aria-labelledby="grant-heading">
          <h2 id="grant-heading" className="font-display mb-4">3. Review and grant</h2>
          <dl className="text-sm space-y-3 break-all">
            <div><dt className="text-mono-xs text-[var(--ink-dim)]">client</dt><dd>{selectedClient ? `${selectedClient.client_name} (${selectedClient.api_key_masked})` : 'No client selected'}</dd></div>
            <div><dt className="text-mono-xs text-[var(--ink-dim)]">selected route</dt><dd>{selectedRoute ? `${selectedRoute.route_pattern} @ ${selectedRoute.domain}` : 'No route selected'}</dd></div>
          </dl>
          {selectedRoute && !visibleRoutes.includes(selectedRoute) && <p className="text-sm text-[var(--amber)] mt-3">Your selected route is outside the current filters. It remains selected below.</p>}
          {selectedRoute && (
            <fieldset className="mt-4">
              <legend className="text-mono-xs mb-2">allowed methods</legend>
              <div className="flex flex-wrap gap-4">
                {availableMethods.map(function methodChoice(method) {
                  return <label key={method} className="inline-flex gap-2 items-center text-sm"><input type="checkbox" checked={methods.includes(method)} onChange={function changeMethod() { toggleMethod(method); }} className="accent-[var(--amber)]" />{method}</label>;
                })}
              </div>
              <p className="text-sm text-[var(--ink-dim)] mt-2">Select at least one method to grant.</p>
            </fieldset>
          )}
          {error && <div role="alert" className="status-error mt-4">{error}</div>}
          <div className="flex flex-wrap justify-end gap-3 mt-6">
            <button type="button" className="btn-secondary" onClick={function cancel() { router.push('/dashboard/permissions'); }}>cancel</button>
            <button type="submit" className="btn-primary" disabled={!canGrant || submitting}>{submitting ? 'granting…' : 'grant permission'}</button>
          </div>
        </section>
      </fieldset>
    </form>
  );
}

/**
 * Runtime config — fetched from the gatekeeper backend on first paint.
 *
 * Replaces the previous build-time NEXT_PUBLIC_* baking so a single frontend
 * image can deploy across tenants. The config is fetched once via
 * RuntimeConfigBootstrap (a client gate that suspends children until ready),
 * then cached at the module level so synchronous getters in browserClient.ts
 * and gatekeeperClient.ts can read it without prop-drilling.
 *
 * The shape mirrors the wire format returned by GET /api/config on the
 * gatekeeper backend (see gatekeeper-backend/src/blueprints/config.py).
 */

export interface RuntimeConfig {
  aegisApiUrl: string;
  siteName: string;
  siteDomain: string;
}

let cached: RuntimeConfig | null = null;

export function setRuntimeConfig(cfg: RuntimeConfig): void {
  cached = cfg;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!cached) {
    throw new Error(
      'Runtime config not loaded — RuntimeConfigBootstrap must mount before any client uses getRuntimeConfig().'
    );
  }
  return cached;
}

export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const res = await fetch('/api/config', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`/api/config returned ${res.status}`);
  }
  return res.json();
}

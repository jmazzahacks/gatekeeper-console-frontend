# gatekeeper-console-frontend

Next.js admin console for [API Gatekeeper](https://github.com/jmazzahacks/api-gatekeeper). Surfaces the four management panels (clients, routes, permissions, rate-limits) over the gatekeeper-backend's `/api/admin/*` endpoints, with login/register/verify-email flows proxied through the backend's `/api/auth/*` proxy to Aegis.

## Architecture in one paragraph

A single image deploys across tenants. URLs and branding (Aegis API URL, site name, site domain) are NOT baked into the JS bundle at build time — they're fetched from the backend's `GET /api/config` on first paint via `lib/runtimeConfig.ts` + `components/RuntimeConfigBootstrap.tsx`. The browser talks to the gatekeeper backend same-origin (`/api/*`), and to Aegis directly (cross-origin) only for bearer-gated calls (`/me`, refresh, logout, confirm-email-change). The six tenant-key-gated public auth calls (login, register, verify-email, etc.) go through the backend's `/api/auth/*` proxy so the per-tenant API key never ships to the browser.

## Local development

```bash
npm install

# Optional: proxy /api/* to a remote gatekeeper backend over HTTPS
# (avoids fighting CORS preflights from localhost:3000)
export DEV_GATEKEEPER_PROXY=https://gatekeeper.example.com

npm run dev
# -> http://localhost:3000
```

Without `DEV_GATEKEEPER_PROXY`, you'd need a local gatekeeper-backend listening on the same hostname (3000) — usually impractical, so the proxy pattern is the default dev workflow.

## Build and publish

```bash
export CR_PAT=<github-pat-with-private-repo-access>
./build-publish.sh
# auto-bumps VERSION, builds linux/amd64,
# pushes ghcr.io/jmazzahacks/gatekeeper-console-frontend:<version> + :latest
```

The image takes only one build arg (`CR_PAT`, used to install private GitHub npm packages). All tenant-specific URLs are runtime — see "Architecture" above.

## Deploying behind nginx

The image expects to sit behind nginx with `/api/*` proxied to gatekeeper-backend and `/` proxied to this Next.js container. There are four traps that have already burned the deploy once each (Cloudflare Error 1000 from `/api/*` falling through to Next.js, Next.js 16 leaking the upstream port via `Location` header, etc.) — see [NGINX_CONF_SKILL.md](./NGINX_CONF_SKILL.md) for a drop-in vhost and the reasoning behind every line.

## Conventions

- App Router (`app/[locale]/...`), `'use client'` components for any state-bearing pages
- `next-intl` for translations; locale-aware `Link` from `@/i18n/navigation`
- `lib/browserClient.ts` and `lib/gatekeeperClient.ts` are the only places that construct API clients — read URLs via `getRuntimeConfig()`, never `process.env`
- `LoadState` discriminated union (`'loading' | 'ready' | 'error'`) for async data fetching in dashboard pages

## License

O'Saasy — see [LICENSE](./LICENSE). Free to use, modify, and redistribute; not free to turn into a hosted SaaS competitor.

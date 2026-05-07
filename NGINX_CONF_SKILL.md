# Gatekeeper nginx vhost — drop-in setup for a tenant host

Hand this file to whatever agent (or human) is bringing up nginx in front of a Gatekeeper deployment on a new host. It is self-contained: read it top-to-bottom and you have everything you need.

The vhost fronts a Gatekeeper deployment (Flask backend + Next.js console frontend) behind Cloudflare. There are four traps that will burn you if you "simplify" past them — all called out in **Traps** below. Read that section before editing anything.

## When to use this

You have:
- A Cloudflare-fronted domain (e.g. `gatekeeper.example.com`) with an Origin certificate already installed.
- Two containers running on this host on a docker network where nginx can reach them by name:
  - `<BACKEND_CONTAINER>` — Flask/gunicorn on port 7843
  - `<FRONTEND_CONTAINER>` — Next.js on port 3000
- An nginx that either runs on the host (with a system resolver) **or** runs as a container on the same docker network as the two containers above.

Goal: a working vhost where the Next.js console is reachable at `/`, and the entire `/api/*` namespace reaches Flask, with no leaked upstream port and no surprise Cloudflare loops.

## Assumptions

Substitute these placeholders consistently throughout the config:

| Placeholder | Example | What it is |
|---|---|---|
| `<DOMAIN>` | `gatekeeper.example.com` | Public hostname behind Cloudflare |
| `<BACKEND_CONTAINER>` | `gatekeeper-backend` | Docker service name of Flask container |
| `<FRONTEND_CONTAINER>` | `gatekeeper-frontend` | Docker service name of Next.js container |

Cloudflare Origin certificate paths assumed at `/etc/nginx/ssl/<DOMAIN>.{crt,key}`. Adjust to whatever this host's nginx convention uses.

## Required: a `resolver` directive must exist

The vhost below uses `set $var <container>; proxy_pass http://$var:port;` on purpose — it forces nginx to do DNS resolution at **request time**, not config-load time, so the vhost survives container restarts. But variable-form `proxy_pass` requires a `resolver` directive somewhere in the nginx config; without it nginx can't ask DNS at request time and these proxies will fail.

**Before applying**, run:

```bash
grep -r "^[[:space:]]*resolver " /etc/nginx/ 2>/dev/null
```

(Adjust path if nginx config lives elsewhere — e.g., a docker volume.)

- If a `resolver` line is already present anywhere included into the http block: you're fine.
- If not, add this once at the top of `nginx.conf`'s `http {}` block (or include a small file that does):

```nginx
# For nginx running as a container on a docker user network, use docker's
# embedded resolver. The valid= sets cache TTL.
resolver 127.0.0.11 valid=10s ipv6=off;

# For nginx running directly on the host, use whatever DNS the host uses
# (often 127.0.0.53 for systemd-resolved, or your upstream DNS):
# resolver 127.0.0.53 valid=10s ipv6=off;
```

Without this, the variable trick fails silently with "no resolver defined" errors and `502 Bad Gateway` at request time. Trap 4 below.

## Drop-in vhost

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name <DOMAIN>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name <DOMAIN>;

    ssl_certificate     /etc/nginx/ssl/<DOMAIN>.crt;
    ssl_certificate_key /etc/nginx/ssl/<DOMAIN>.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    access_log /var/log/nginx/<DOMAIN>_access.log;
    error_log  /var/log/nginx/<DOMAIN>_error.log;

    # All /api/* (admin, auth, config, webhooks/aegis, ...) goes to the
    # gatekeeper backend. The frontend defines no /api/* routes — routing
    # an unmapped /api/* to Next.js will server-side-fetch the same origin
    # and loop through Cloudflare, producing Error 1000.
    location /api/ {
        set $gk_backend <BACKEND_CONTAINER>;
        proxy_pass http://$gk_backend:7843;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # 30s, not 10s: the /api/auth/* proxy makes synchronous outbound
        # calls to Aegis, which can occasionally take longer under cold
        # start or upstream DB pressure. The gatekeeper itself responds
        # in single-digit ms; the headroom is for Aegis.
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
    }

    location / {
        set $gk_frontend <FRONTEND_CONTAINER>;
        proxy_pass http://$gk_frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # X-Forwarded-Host + X-Forwarded-Port are required: without them,
        # Next.js 16's i18n middleware bakes the UPSTREAM port (3000) into
        # the Location header on its locale redirect, and browsers then
        # try to follow https://<DOMAIN>:3000/en, which fails.
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Optional: extra root-level backend endpoints

The gatekeeper-backend exposes three endpoints **at the root**, not under `/api/`:

| Path | Purpose | Add to this vhost? |
|---|---|---|
| `/authz` | nginx `auth_request` target for protected services | Only if this gatekeeper instance is the auth source for vhosts that proxy auth_request to it via the **public URL** of this domain. If protected vhosts are on the same host and reach the backend over the docker network directly, leave it out. |
| `/health` | health probe | Add only if external monitoring scrapes via the public URL. Internal docker `HEALTHCHECK` and Prometheus usually hit the container directly. |
| `/metrics` | Prometheus metrics | Same as `/health` — usually internal-only. |

If you need any of these on this vhost, add a single shared backend block:

```nginx
location ~ ^/(authz|health|metrics)$ {
    set $gk_backend <BACKEND_CONTAINER>;
    proxy_pass http://$gk_backend:7843;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

(`/authz` in particular often wants `internal;` if it's only consumed by other location blocks on the same nginx, not by external clients. Add `internal;` inside the block in that case.)

If you're not sure whether you need `/authz`, leave it out. After applying, run `curl https://<DOMAIN>/authz`. If something else on this host or another host depends on it, you'll see traffic break and you can come back and add it. A 404 from Next.js when nothing depends on it is harmless.

## Traps — do not "simplify" any of these away

1. **`location /api/` is intentionally a broad prefix block, not per-route.** Don't break it out into `location /api/admin/`, `location /api/auth/`, `location /api/config`, etc. Every time the backend adds a new public endpoint (and it will), a per-route allowlist would silently route the new path to Next.js, which then server-side-fetches its own origin and Cloudflare returns Error 1000 — "DNS points to prohibited IP". Catch-all on `/api/` is the safe shape.

2. **`X-Forwarded-Host` and `X-Forwarded-Port: 443` on the `/` block are not optional.** Next.js 16 (with `next-intl` middleware) builds absolute redirect URLs from request metadata. Without these headers, the upstream port (3000) leaks into `Location`. Symptom: hitting `/` returns `307` with `Location: https://<DOMAIN>:3000/en` — broken in every browser.

3. **The `set $var <container>; proxy_pass http://$var:port;` pattern is intentional.** Writing `proxy_pass http://<container>:7843;` literally makes nginx resolve the hostname at config-load time. If the container is down when nginx reloads, nginx refuses to start. The `set` indirection defers resolution until request time, so the vhost survives container churn.

4. **The variable-form `proxy_pass` (trap 3) requires a `resolver` directive.** See the "Required: a `resolver` directive must exist" section above. Without one, request-time DNS lookup fails and you get `502 Bad Gateway`. The required directive lives once in the http block, not per-location.

## Apply

```bash
# Drop the file into the right path for this host's nginx layout
# (e.g. /etc/nginx/conf.d/<DOMAIN>.conf, /etc/nginx/sites-available/<DOMAIN>,
#  or the dockerized equivalent).

nginx -t && nginx -s reload
# If nginx runs in a container:
# docker exec <nginx-container> nginx -t && docker exec <nginx-container> nginx -s reload
```

If `nginx -t` complains about missing `resolver`, go back to the "Required: a `resolver` directive must exist" section.

## Smoke tests

Run from anywhere on the public internet:

```bash
# 1. Frontend root -> should 307 to /<locale> on the SAME origin (no :3000 leak)
curl -i -s -o /dev/null -w 'status=%{http_code}\nlocation=%{redirect_url}\n' \
  https://<DOMAIN>/

# 2. Public config endpoint -> 200 with JSON
curl -i https://<DOMAIN>/api/config

# 3. Auth probe -> 400 with {"error":"Invalid or expired verification token"}
curl -i -X POST https://<DOMAIN>/api/auth/check-verification-token \
  -H 'Content-Type: application/json' \
  -d '{"token":"probe"}'

# 4. Admin probe -> 401
curl -s -o /dev/null -w '%{http_code}\n' https://<DOMAIN>/api/admin/clients
```

### Expected status matrix

| Path | Expected | What it proves |
|---|---|---|
| `GET /` | 307 -> `https://<DOMAIN>/<locale>` (no `:3000`) | X-Forwarded-* headers landed correctly |
| `GET /api/config` | 200, JSON `{aegisApiUrl, siteName, siteDomain}` | `/api/*` routes to backend; `/api/config` reachable |
| `POST /api/auth/check-verification-token` | 400 JSON | Backend reachable, Aegis tenant key valid |
| `GET /api/admin/clients` | 401 JSON | Admin namespace reachable, auth enforced |

## Failure decoder

| Symptom | Likely cause | Fix |
|---|---|---|
| `/` redirects to `https://<DOMAIN>:3000/...` | Missing `X-Forwarded-Host` / `X-Forwarded-Port` | Add them on the `/` block (Trap 2) |
| `/api/<anything>` returns 403 with Cloudflare HTML (`errorCode: 1000`, `<title>DNS points to prohibited IP</title>`) | nginx routed `/api/*` to Next.js → server-side-fetch loop through Cloudflare | Make `location /api/` a single broad block targeting the backend (Trap 1) |
| `502 Bad Gateway` on first request after container restart | Variable-form `proxy_pass` with no resolver, or a stale glibc lookup | Confirm `resolver` directive is present in the http block (Trap 4); restart nginx after adding |
| `nginx -t` fails with `host not found in upstream "<container>"` | Container down + literal (non-variable) `proxy_pass` | Use `set $var <container>; proxy_pass http://$var:port;` (Trap 3) |
| `/api/auth/*` returns 401 `"Invalid or missing tenant API key"` | Backend env mismatch — `AEGIS_TENANT_API_KEY` / `AEGIS_SITE_ID` don't match Aegis's `sites` row | Out of nginx scope; fix backend env |
| `/api/config` returns 200 but JSON is `{"aegisApiUrl":"","siteName":"gatekeeper","siteDomain":""}` | Backend env vars `AEGIS_API_URL` / `SITE_NAME` / `SITE_DOMAIN` missing | Out of nginx scope; set them in backend container env and restart |
| Browser shows "Failed to load configuration from /api/config: ..." | The frontend successfully reached `/api/config` but got a non-200 response | Run smoke test 2 above; whatever curl shows is what the browser sees |

## Report back

Reply with:

- Output of all four smoke tests
- The vhost file path you used
- Confirmation that `nginx -t` passed and reload succeeded
- Confirmation of which optional root-level endpoints (`/authz`, `/health`, `/metrics`) you added, if any, and why

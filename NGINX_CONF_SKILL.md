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

## CORS for services protected by gatekeeper `/authz`

Skip this section if your nginx vhost only serves the gatekeeper frontend + backend (the drop-in vhost above). It applies when **another** service on **another** vhost uses `auth_request /authz_subrequest;` to delegate authorization to gatekeeper, and that service is called by a browser cross-origin (typical: a tenant frontend on `https://app.example.com` calling APIs on `https://api.example.com`).

Without this, every cross-origin call sends an `OPTIONS` preflight, gatekeeper checks `OPTIONS` against the route's allowed-methods list, finds it isn't configured, and denies — symptom is a generic browser CORS error.

### One-time backend setup

Set `CORS_ALLOWED_ORIGINS` in the gatekeeper-backend env (comma-separated, no trailing slash):

```
CORS_ALLOWED_ORIGINS=https://app.example.com,http://localhost:3000
```

Once set, gatekeeper short-circuits OPTIONS preflights for matching routes and returns the standard `Access-Control-*` headers from `/authz`. The consumer's nginx still has to relay those headers — that's the rest of this section.

### vhost on the protected service

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    # ssl_certificate / ssl_certificate_key as usual ...

    # Internal subrequest target. Adjust hostname/port to wherever gatekeeper
    # listens (often a docker service name on a shared user network).
    location = /authz_subrequest {
        internal;
        set $gk_backend gatekeeper-backend;
        proxy_pass http://$gk_backend:7843/authz;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";

        # Required: gatekeeper authorizes against the original request, not the
        # subrequest's own URI/method.
        proxy_set_header X-Original-URI    $request_uri;
        proxy_set_header X-Original-Method $request_method;
        proxy_set_header X-Original-Host   $host;

        # Required for CORS: forward Origin + the two preflight metadata headers.
        # Gatekeeper reads these to decide whether the origin is allowlisted and
        # what to put in Access-Control-Allow-Headers / Allow-Methods.
        proxy_set_header X-Original-Origin               $http_origin;
        proxy_set_header X-Original-User-Agent           $http_user_agent;
        proxy_set_header Access-Control-Request-Method   $http_access_control_request_method;
        proxy_set_header Access-Control-Request-Headers  $http_access_control_request_headers;
    }

    location /api/ {
        auth_request /authz_subrequest;

        # Pull CORS headers off the subrequest response so we can re-emit them
        # to the browser. `auth_request_set` only fires when the subrequest
        # returns 2xx — that's fine: gatekeeper returns 200 for both allowed
        # actual requests and allowed preflights.
        auth_request_set $cors_origin   $upstream_http_access_control_allow_origin;
        auth_request_set $cors_methods  $upstream_http_access_control_allow_methods;
        auth_request_set $cors_headers  $upstream_http_access_control_allow_headers;
        auth_request_set $cors_max_age  $upstream_http_access_control_max_age;

        # Short-circuit OPTIONS preflights. Gatekeeper has already validated the
        # Origin and built the response headers; we just need to reply 204 with
        # them. Without this `if` block, nginx would forward OPTIONS to the
        # upstream API, which usually returns 405 Method Not Allowed.
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin  $cors_origin;
            add_header Access-Control-Allow-Methods $cors_methods;
            add_header Access-Control-Allow-Headers $cors_headers;
            add_header Access-Control-Max-Age       $cors_max_age;
            add_header Vary                         "Origin";
            add_header Content-Length               0;
            add_header Content-Type                 "text/plain charset=UTF-8";
            return 204;
        }

        # Stamp the actual-request CORS headers. `always` is required: nginx
        # otherwise drops add_header on 4xx, and the browser would silently
        # discard the body of authz denials.
        add_header Access-Control-Allow-Origin $cors_origin always;
        add_header Vary                        "Origin"     always;

        # Your upstream API ...
        proxy_pass http://your-upstream:8080;
        proxy_set_header Host $host;
        # ... etc
    }
}
```

### Consumer-side traps

1. **`if ($request_method = OPTIONS)` must come BEFORE `proxy_pass`.** nginx evaluates `if` blocks then continues to the `proxy_pass` only if no `return` fired. Forgetting the `return 204` causes the OPTIONS to also hit the upstream, which usually 405s.
2. **`always` on `add_header` for actual responses is required.** Without it, the headers vanish on 4xx/5xx and the browser drops the body of denials — making "rate limit exceeded" or "no permission" invisible to the calling app.
3. **Origin must be on the gatekeeper's allowlist.** If it isn't, gatekeeper returns 403 from `/authz` and nginx denies the original request before the OPTIONS short-circuit gets a chance to run. Add the origin to `CORS_ALLOWED_ORIGINS` in the backend env.
4. **Don't add a separate `add_header Access-Control-Allow-Origin '*'` here.** The `*` wildcard fights with credentialed requests (browsers reject `*` when `withCredentials: true`); echoing the actual allowlisted origin avoids the conflict.

### Smoke test from anywhere on the public internet

```bash
# Should be HTTP/2 204 with all four Access-Control-* headers + Vary: Origin
curl -i -X OPTIONS https://api.example.com/api/some-protected-route \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization"
```

A 403 means gatekeeper rejected the origin (check `CORS_ALLOWED_ORIGINS`). A 405 means the OPTIONS short-circuit didn't fire (check the `if` block + `auth_request_set` directives).

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

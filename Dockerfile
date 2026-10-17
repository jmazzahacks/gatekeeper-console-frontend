# syntax=docker/dockerfile:1
# =============================================================
# Stage 1: Dependencies
# =============================================================
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache git

COPY package.json package-lock.json ./

# Secret-backed git authentication keeps tokens out of image history and URLs.
RUN --mount=type=secret,id=cr_pat,required=true <<'SH'
set -eu
export GIT_CONFIG_COUNT=3
export GIT_CONFIG_KEY_0=credential.https://github.com.helper
export GIT_CONFIG_VALUE_0='!f() { printf "username=x-access-token\npassword="; cat /run/secrets/cr_pat; }; f'
export GIT_CONFIG_KEY_1=url.https://github.com/.insteadOf
export GIT_CONFIG_VALUE_1=ssh://git@github.com/
export GIT_CONFIG_KEY_2=url.https://github.com/.insteadOf
export GIT_CONFIG_VALUE_2=git@github.com:
export GIT_TERMINAL_PROMPT=0
npm ci
SH

# =============================================================
# Stage 2: Builder
# =============================================================
FROM node:22-alpine AS builder
WORKDIR /app

# No NEXT_PUBLIC_* build args — runtime URLs and branding are fetched from
# the backend at first paint via /api/config (see lib/runtimeConfig.ts), so a
# single image deploys across tenants without a rebuild.

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build

# =============================================================
# Stage 3: Runner
# =============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DEBUG_LOCAL=false

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

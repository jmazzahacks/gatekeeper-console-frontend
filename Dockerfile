# =============================================================
# Stage 1: Dependencies
# =============================================================
FROM node:20-alpine AS deps
WORKDIR /app

ARG CR_PAT

RUN apk add --no-cache git

RUN git config --global url."https://${CR_PAT}@github.com/".insteadOf "https://github.com/"

COPY package.json package-lock.json ./

RUN npm ci

# =============================================================
# Stage 2: Builder
# =============================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time arguments — these get baked into the client bundle
ARG NEXT_PUBLIC_AEGIS_API_URL
ARG NEXT_PUBLIC_SITE_DOMAIN

ENV NEXT_PUBLIC_AEGIS_API_URL=$NEXT_PUBLIC_AEGIS_API_URL
ENV NEXT_PUBLIC_SITE_DOMAIN=$NEXT_PUBLIC_SITE_DOMAIN

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build

# =============================================================
# Stage 3: Runner
# =============================================================
FROM node:20-alpine AS runner
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
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]

# ════════════════════════════════════════════════════════════
#  WithUnion CRM — Production Docker image
#  Multi-stage build → standalone Next.js runtime
#  Deploy target: Coolify, Fly.io, Railway, Render, any VPS
# ════════════════════════════════════════════════════════════

# ─── Stage 1: install dependencies ──────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci


# ─── Stage 2: build the application ─────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true

# Placeholder DB URL so the build can complete without a live database.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

RUN npm run build


# ─── Stage 3: migration / seed tooling (not shipped at runtime) ───
# Has dev dependencies (drizzle-kit, tsx) and the source needed to run
# `db:push` / `db:seed` against the configured database.
FROM deps AS tools
WORKDIR /app

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src

ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "run", "db:push"]


# ─── Stage 4: minimal runtime image ─────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV STORAGE_DIR=/app/storage/uploads

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs \
 && mkdir -p /app/storage/uploads \
 && chown -R nextjs:nodejs /app/storage

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

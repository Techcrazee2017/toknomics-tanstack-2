# ============================================================================
# GiftStream — Worker Dockerfile (Node.js WebSocket ingestion service)
# ============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Dependencies stage ---
FROM base AS deps
COPY worker/package.json worker/package-lock.json* ./
RUN npm ci --production

# --- Build stage ---
FROM base AS builder
WORKDIR /app
COPY worker/package.json ./
RUN npm install
COPY tsconfig.json ./
COPY worker/ ./worker/
COPY src/types/ ./src/types/
RUN npx tsc -p worker/tsconfig.json

# --- Production stage ---
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist/worker ./dist/worker

USER worker

CMD ["node", "dist/worker/index.js"]

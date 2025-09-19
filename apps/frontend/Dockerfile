# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# Install deps (including dev) so Tailwind/PostCSS exist for the build
RUN npm config set registry https://registry.npmjs.org \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 600000 \
    && npm config set audit false \
    && npm config set fund false \
    && if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; \
    elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
    else npm install --no-audit --no-fund; fi

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time flags that next.config.ts reads
ARG SET_API_TO_LOCAL=0
ARG API_LOCAL_TARGET=http://backend:8000
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SET_API_TO_LOCAL=$SET_API_TO_LOCAL
ENV API_LOCAL_TARGET=$API_LOCAL_TARGET
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build


# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json package-lock.json* ./
# Install only production dependencies for runtime
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund
CMD ["npm","run","start"]
    
# ---------- dev ----------
FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
# Improve file watching reliability in Docker on macOS/Windows
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# Install all dependencies (incl. dev) for the dev server
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
# Source code will be mounted as a volume in docker-compose for live reload
EXPOSE 3000
CMD ["npm","run","dev"]

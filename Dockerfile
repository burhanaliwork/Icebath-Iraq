FROM node:20-slim

WORKDIR /app

# Install pnpm (match version from lock file)
RUN npm install -g pnpm@10.26.1

# ── 1. Copy workspace manifests first (layer-cache friendly) ─────────────────
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./

COPY lib/db/package.json            ./lib/db/
COPY lib/api-zod/package.json       ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json      ./lib/api-spec/
COPY scripts/package.json           ./scripts/
COPY artifacts/api-server/package.json  ./artifacts/api-server/
COPY artifacts/icebath-iraq/package.json ./artifacts/icebath-iraq/

# ── 2. Install all dependencies (dev included — needed for build tools) ───────
RUN pnpm install --frozen-lockfile

# ── 3. Copy all source files ──────────────────────────────────────────────────
COPY tsconfig.json tsconfig.base.json ./
COPY lib/       ./lib/
COPY scripts/   ./scripts/
COPY artifacts/api-server/  ./artifacts/api-server/
COPY artifacts/icebath-iraq/ ./artifacts/icebath-iraq/

# ── 4. Build frontend (Vite → artifacts/icebath-iraq/dist/public/) ────────────
RUN pnpm --filter @workspace/icebath-iraq run build

# ── 5. Build API server (esbuild → artifacts/api-server/dist/) ───────────────
RUN pnpm --filter @workspace/api-server run build

# ── 6. Expose the port the server listens on ─────────────────────────────────
EXPOSE 8080

# ── 7. Push DB schema then start the server ───────────────────────────────────
# drizzle-kit push is safe to run on every deploy — it is a no-op when the
# schema is already up-to-date and never drops data.
CMD ["sh", "-c", "pnpm --filter @workspace/db run push && node --enable-source-maps artifacts/api-server/dist/index.mjs"]

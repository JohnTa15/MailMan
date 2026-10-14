# Mailman API server. Build from the repository root:
#   docker build -t mailman-server .
# Works on amd64 and arm64 (e.g. Raspberry Pi 4/5 with a 64-bit OS).

# Official Node image; override if Docker Hub rate-limits you, e.g.
#   --build-arg NODE_IMAGE=public.ecr.aws/docker/library/node:22-bookworm-slim
ARG NODE_IMAGE=node:22-bookworm-slim

# --- Base: workspace manifests + toolchain for native modules -------------
FROM ${NODE_IMAGE} AS base
WORKDIR /app
# Only used if no prebuilt sqlite3 binary matches the platform
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
# npm workspaces need every workspace manifest to validate the lockfile
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY electron/package.json electron/

# --- Production dependencies of the server only ---------------------------
FROM base AS deps
RUN npm ci --workspace=server --include-workspace-root=false --omit=dev --no-audit --no-fund \
 # typeorm's optional ts-node peer drags these in; the server never uses them
 && rm -rf node_modules/typescript node_modules/ts-node \
 # Holds the server's own non-hoisted dependencies (may be empty)
 && mkdir -p server/node_modules

# --- Build ----------------------------------------------------------------
FROM base AS build
RUN npm ci --workspace=server --include-workspace-root=false --no-audit --no-fund
COPY server/ server/
RUN npm run build --workspace=server

# --- Runtime --------------------------------------------------------------
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_PATH=/data/webmail.db \
    NODE_OPTIONS=--max-old-space-size=256
WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/server/node_modules ./server/node_modules
COPY --from=build --chown=node:node /app/server/package.json ./server/package.json
COPY --from=build --chown=node:node /app/server/dist ./server/dist
RUN mkdir -p /data && chown node:node /data

USER node
WORKDIR /app/server
VOLUME ["/data"]
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "dist/main"]

# ============================================
# Mailman - Multi-stage Docker Build
# ============================================

# Stage 1: Build the client (React + Vite)
FROM node:22-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Build the server (NestJS)
FROM node:22-slim AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Production image
FROM node:22-slim AS production
LABEL maintainer="Mailman Contributors"
LABEL description="OpenWebMail - Open Source Web Mail Client"

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init sqlite3 curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server build and dependencies
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./

# Copy client build as static files served by the NestJS server
COPY --from=client-builder /app/client/dist ./public

# Create data directories
RUN mkdir -p /app/data/templates /app/data/logs /app/plugins && \
    chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/app/data/webmail.db
ENV CORS_ORIGIN=*
ENV PLUGINS_DIR=/app/plugins
ENV TEMPLATES_DIR=/app/data/templates
ENV AUDIT_LOG_DIR=/app/data/logs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

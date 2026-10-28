# ============================================
# Mailman - Multi-stage Docker Build
# For local development and GCP Cloud Run testing
# ============================================

# Stage 1: Build the client (React + Vite)
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci --prefer-offline
COPY client/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Build the server (NestJS)
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci --prefer-offline
COPY server/ ./
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine AS production
LABEL maintainer="Mailman Contributors"
LABEL description="OpenWebMail - Open Source Web Mail Client"
LABEL org.opencontainers.image.source="https://github.com/mailman/openwebmail"
LABEL org.opencontainers.image.licenses="MIT"

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init sqlite

WORKDIR /app

# Copy server build and dependencies
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./

# Copy client build as static files served by the NestJS server
COPY --from=client-builder /app/client/dist ./public

# Create data directories for SQLite, templates, logs, and plugins
RUN mkdir -p /app/data/templates /app/data/logs /app/plugins && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Environment variables (all configurable via GCP Cloud Run env vars)
ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/app/data/webmail.db
ENV CORS_ORIGIN=*
ENV PLUGINS_DIR=/app/plugins
ENV TEMPLATES_DIR=/app/data/templates
ENV AUDIT_LOG_DIR=/app/data/logs

# Expose the port Cloud Run expects
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Use dumb-init to handle SIGTERM properly for graceful shutdown
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

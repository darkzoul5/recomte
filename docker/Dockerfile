# ============= Builder Stage =============
FROM node:24.18.0-slim as builder

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install and prune production dependencies
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# ============= Runtime Stage =============
FROM node:24.18.0-slim

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && \
    addgroup --system deploy && \
    adduser --system --group deploy --uid deploy && \
    mkdir -p /app/storage/db /app/storage/backups /app/storage/images/caravans && \
    chown -R deploy:deploy /app/storage

# Copy pre-built node_modules from builder stage
COPY --from=builder --chown=deploy:deploy /app/node_modules ./node_modules

# Copy necessary application files
COPY db/ ./db

COPY --chown=deploy:deploy public/ ./public
COPY --chmod=755 docker/entrypoint.sh .
COPY --chown=deploy:deploy scripts/ ./scripts
COPY --chown=deploy:deploy src/ ./src
COPY --chown=deploy:deploy views/ ./views

COPY version.json .

# Security hardening: remove setuid/setgid binaries and clean temp files
RUN chmod 700 /app/storage && \
    rm -rf /tmp/* /var/tmp/* && \
    find / -xdev -type f -perm /6000 2>/dev/null | xargs chmod a-s 2>/dev/null || true

USER 1001:1001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthcheck').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]

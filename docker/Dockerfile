FROM node:24.18.0-alpine

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

RUN addgroup -S deploy \
  && adduser -S -G deploy -u 1001 deploy \
  && mkdir -p /app/storage/db /app/storage/backups /app/storage/images/caravans \
  && chown -R deploy:deploy /app/storage

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# Copy necessary application files
COPY db/ ./db

COPY --chown=deploy:deploy public/ ./public
COPY --chmod=755 docker/entrypoint.sh .
COPY --chown=deploy:deploy scripts/ ./scripts
COPY --chown=deploy:deploy src/ ./src
COPY --chown=deploy:deploy views/ ./views

COPY version.json .

USER 1001:1001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthcheck').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]

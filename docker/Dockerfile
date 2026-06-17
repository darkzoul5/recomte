FROM node:24.16.0-alpine3.24

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

RUN addgroup -S deploy \
  && adduser -S -G deploy -u 1001 deploy \
  && mkdir -p /app/storage/db /app/storage/backups /app/storage/images/caravans \
  && chown -R deploy:deploy /app/storage

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy necessary application files
COPY db/ ./db
COPY public/ ./public
COPY scripts/ ./scripts
COPY src/ ./src
COPY views/ ./views
COPY --chmod=755 docker/entrypoint.sh .
COPY version.json .

USER 1001:1001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthcheck').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]

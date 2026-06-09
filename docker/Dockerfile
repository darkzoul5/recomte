FROM node:24.16.0-alpine3.23

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml ./

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

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthcheck').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]

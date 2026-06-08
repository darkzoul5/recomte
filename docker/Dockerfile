FROM node:24.15.0-alpine3.23

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

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

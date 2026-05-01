FROM node:lts-alpine

WORKDIR /app

# Copy only package files for dependency installation
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy only necessary application files
COPY public-server.js .
COPY admin-app.js .
COPY db/ ./db
COPY src/ ./src
COPY views/ ./views
COPY scripts/ ./scripts
COPY public/ ./public
COPY --chmod=755 entrypoint.sh .

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthcheck').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]

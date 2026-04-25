FROM node:lts-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy only package files for dependency installation
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy only necessary application files
COPY public-server.js .
COPY admin-app.js .
COPY db/ ./db
COPY src/ ./src
COPY views/ ./views
COPY public/ ./public
COPY scripts/ ./scripts
COPY --chmod=755 entrypoint.sh .

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl --fail --silent --show-error http://localhost:3000/healthcheck > /dev/null || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
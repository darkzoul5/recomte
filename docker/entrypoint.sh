#!/bin/sh
set -e

echo "Starting Recomte.ru application..."

# Set default environment variables if not provided
export NODE_ENV=${NODE_ENV:-production}
export STORAGE_ROOT=${STORAGE_ROOT:-/app/storage}
export DB_PATH=${DB_PATH:-${STORAGE_ROOT}/db/app.db}
export SESSION_SECRET=${SESSION_SECRET:-default_secret_change_in_production}
export LOG_LEVEL=${LOG_LEVEL:-info}
export ADMIN_LOG_LEVEL=${ADMIN_LOG_LEVEL:-info}
export PUBLIC_LOG_LEVEL=${PUBLIC_LOG_LEVEL:-info}
export PORT=${PORT:-3000}
export ADMIN_PORT=${ADMIN_PORT:-3001}
export ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
export ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}

# Create runtime storage directories if they don't exist
mkdir -p "${STORAGE_ROOT}/db"
mkdir -p "${STORAGE_ROOT}/backups"
mkdir -p "${STORAGE_ROOT}/images/caravans"

# Initialize database if needed
if [ ! -f "$DB_PATH" ]; then
  echo "Database file not found at $DB_PATH, initializing..."
  node /app/scripts/init-db.js
  echo "✓ Database initialized successfully"
else

  echo "Running db migrations..."
  node /app/scripts/migrate-db.js
  
  echo "Validating db schema..."
  if node /app/scripts/validate-db.js; then
    echo "✓ Database is properly initialized"
  else
    echo "✗ FATAL: Database is corrupted or incomplete!"
    BACKUP_FILE="$DB_PATH.corrupted.$(date +%s)"
    cp "$DB_PATH" "$BACKUP_FILE"
    echo "⚠ Corrupted database backed up to: $BACKUP_FILE"
    echo "⚠ Please restore from backup or delete the corrupted file to reinitialize"
    exit 1
  fi
fi

# Start the application
echo "Starting Node.js application..."
echo "Environment: $NODE_ENV"
echo "Storage root: $STORAGE_ROOT"
echo "Database path: $DB_PATH"
echo "Log level: $LOG_LEVEL"
echo "Admin log level: $ADMIN_LOG_LEVEL"
echo "Public log level: $PUBLIC_LOG_LEVEL"

SERVER_MODE=all node /app/src/server/index.js &
SERVER_PID=$!

trap 'kill $SERVER_PID 2>/dev/null || true' INT TERM
wait $SERVER_PID

#!/bin/sh
set -e

echo "Starting Recomte.ru application..."

# Set default environment variables if not provided
export NODE_ENV=${NODE_ENV:-production}
export DB_PATH=${DB_PATH:-./data/app.db}
export SESSION_SECRET=${SESSION_SECRET:-default_secret_change_in_production}

# Create data directory if it doesn't exist
mkdir -p /app/data
mkdir -p /app/public/images

# Initialize database if needed
if [ ! -f "$DB_PATH" ]; then
  echo "Database file not found at $DB_PATH, initializing..."
  node /app/scripts/init-db.js
  echo "✓ Database initialized successfully"
else
  echo "Database file exists, validating schema..."
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
echo "Database path: $DB_PATH"
echo "Log level: $LOG_LEVEL"

SERVER_MODE=public node /app/src/server/index.js &
PUBLIC_PID=$!

SERVER_MODE=admin node /app/src/server/admin.js &
ADMIN_PID=$!

trap 'kill $PUBLIC_PID $ADMIN_PID 2>/dev/null || true' INT TERM
wait $PUBLIC_PID $ADMIN_PID

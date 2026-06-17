export const name = 'add auth throttle state';

export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_throttle_state (
      state_key TEXT PRIMARY KEY,
      state_type TEXT NOT NULL CHECK (state_type IN ('rate_limit', 'login_attempt')),
      count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
      window_start INTEGER,
      first_attempt_at INTEGER,
      lock_until INTEGER,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_auth_throttle_state_type
      ON auth_throttle_state(state_type);

    CREATE INDEX IF NOT EXISTS idx_auth_throttle_state_window_start
      ON auth_throttle_state(state_type, window_start);

    CREATE INDEX IF NOT EXISTS idx_auth_throttle_state_lock_until
      ON auth_throttle_state(state_type, lock_until);

    CREATE INDEX IF NOT EXISTS idx_auth_throttle_state_expires_at
      ON auth_throttle_state(expires_at);
  `);
};

export default { name, up };

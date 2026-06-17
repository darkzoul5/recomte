import { getDb } from '../../../db/db.js';

const STATE_TYPE_RATE_LIMIT = 'rate_limit';
const STATE_TYPE_LOGIN_ATTEMPT = 'login_attempt';

let cachedDb = null;
let statements = null;

const mapThrottleState = (row) => {
  if (!row) {
    return null;
  }

  return {
    stateKey: row.state_key,
    stateType: row.state_type,
    count: Number(row.count || 0),
    windowStart: row.window_start,
    firstAttemptAt: row.first_attempt_at,
    lockUntil: row.lock_until,
    expiresAt: row.expires_at
  };
};

const getStatements = () => {
  const db = getDb();
  if (db !== cachedDb || !statements) {
    cachedDb = db;
    statements = {
      selectByKey: db.prepare(
        'SELECT state_key, state_type, count, window_start, first_attempt_at, lock_until, expires_at FROM auth_throttle_state WHERE state_key = ? LIMIT 1'
      ),
      upsert: db.prepare(
        `INSERT INTO auth_throttle_state (
          state_key, state_type, count, window_start, first_attempt_at, lock_until, expires_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(state_key)
        DO UPDATE SET
          state_type = excluded.state_type,
          count = excluded.count,
          window_start = excluded.window_start,
          first_attempt_at = excluded.first_attempt_at,
          lock_until = excluded.lock_until,
          expires_at = excluded.expires_at,
          updated_at = CURRENT_TIMESTAMP`
      ),
      deleteByKey: db.prepare('DELETE FROM auth_throttle_state WHERE state_key = ?'),
      cleanupExpired: db.prepare('DELETE FROM auth_throttle_state WHERE expires_at <= ?')
    };
  }

  return statements;
};

const runImmediateTransaction = (callback) => {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');

  try {
    const result = callback(getStatements());
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Preserve the original failure.
    }
    throw error;
  }
};

const normalizeUsername = (username) => {
  if (typeof username !== 'string') {
    return '';
  }

  return username.trim().toLowerCase();
};

const normalizeKeyPart = (value) => {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  const trimmed = value.trim();
  return trimmed || 'unknown';
};

const getAttemptExpiresAt = ({ firstAttemptAt, lockUntil, attemptWindowMs }) => {
  const attemptWindowExpiresAt = firstAttemptAt + attemptWindowMs;
  return Math.max(attemptWindowExpiresAt, Number.isInteger(lockUntil) ? lockUntil : 0);
};

export const getClientIp = (request) => {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstForwardedIp = typeof forwardedValue === 'string' ? forwardedValue.split(',')[0].trim() : '';
  const directIp = typeof request.ip === 'string' ? request.ip.trim() : '';

  return normalizeKeyPart(directIp || firstForwardedIp || 'unknown');
};

export const buildRateLimitKey = (routeKey, request) => {
  const route = normalizeKeyPart(typeof routeKey === 'string' ? routeKey : '');
  return `${STATE_TYPE_RATE_LIMIT}:${route}:${getClientIp(request)}`;
};

export const buildLoginAttemptKeySet = (username, ip) => {
  const normalizedUsername = normalizeUsername(username);
  const normalizedIp = normalizeKeyPart(ip);

  return {
    accountKey: normalizedUsername ? `${STATE_TYPE_LOGIN_ATTEMPT}:acct:${normalizedUsername}` : null,
    ipKey: `${STATE_TYPE_LOGIN_ATTEMPT}:ip:${normalizedIp}`
  };
};

export const buildLoginAttemptKeys = (username, ip) => {
  const { accountKey, ipKey } = buildLoginAttemptKeySet(username, ip);
  return [accountKey, ipKey].filter(Boolean);
};

export const getThrottleState = (stateKey) => {
  if (typeof stateKey !== 'string' || !stateKey.trim()) {
    return null;
  }

  return mapThrottleState(getStatements().selectByKey.get(stateKey.trim()));
};

export const deleteThrottleState = (stateKey) => {
  if (typeof stateKey !== 'string' || !stateKey.trim()) {
    return;
  }

  getStatements().deleteByKey.run(stateKey.trim());
};

export const cleanupExpiredThrottleState = ({ now = Date.now() } = {}) => {
  getStatements().cleanupExpired.run(now);
};

export const consumeRateLimit = ({ stateKey, now = Date.now(), windowMs }) => runImmediateTransaction((dbStatements) => {
  const previous = mapThrottleState(dbStatements.selectByKey.get(stateKey));
  const isFreshWindow = !previous || previous.expiresAt <= now;
  const windowStart = isFreshWindow ? now : previous.windowStart;
  const count = isFreshWindow ? 1 : previous.count + 1;
  const expiresAt = windowStart + windowMs;

  dbStatements.upsert.run(
    stateKey,
    STATE_TYPE_RATE_LIMIT,
    count,
    windowStart,
    null,
    null,
    expiresAt
  );

  return { count, windowStart, expiresAt };
});

export const registerFailedLoginAttempt = ({
  stateKey,
  now = Date.now(),
  attemptWindowMs,
  maxFailedAttempts,
  lockoutMs
}) => runImmediateTransaction((dbStatements) => {
  const previous = mapThrottleState(dbStatements.selectByKey.get(stateKey));
  const isFreshWindow = !previous || previous.expiresAt <= now;
  const firstAttemptAt = isFreshWindow ? now : previous.firstAttemptAt;
  const count = isFreshWindow ? 1 : previous.count + 1;
  const lockUntil = count >= maxFailedAttempts ? now + lockoutMs : null;
  const expiresAt = getAttemptExpiresAt({ firstAttemptAt, lockUntil, attemptWindowMs });

  dbStatements.upsert.run(
    stateKey,
    STATE_TYPE_LOGIN_ATTEMPT,
    count,
    null,
    firstAttemptAt,
    lockUntil,
    expiresAt
  );

  return { count, firstAttemptAt, lockUntil, expiresAt };
});


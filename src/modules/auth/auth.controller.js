import {
  verifyAdminCredentials,
  ensureInitialAdminUser
} from './auth.service.js';
import {
  setAdminSession,
  clearAdminSession,
  ensureCsrfToken,
  getCsrfTokenFromRequest,
  verifyCsrfToken,
  isAdminSessionValid
} from './auth.middleware.js';
import {
  buildLoginAttemptKeys,
  buildLoginAttemptKeySet,
  buildRateLimitKey,
  cleanupExpiredThrottleState,
  consumeRateLimit,
  deleteThrottleState,
  getClientIp,
  getThrottleState,
  registerFailedLoginAttempt
} from './auth-throttle.store.js';

const MINUTE_MS = 60 * 1000;
const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || `${MINUTE_MS}`, 10);
const AUTH_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '30', 10);
const LOGIN_ATTEMPT_WINDOW_MS = parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MS || `${10 * MINUTE_MS}`, 10);
const LOGIN_MAX_FAILED_ATTEMPTS = parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS || '10', 10);
const LOGIN_LOCKOUT_MS = parseInt(process.env.LOGIN_LOCKOUT_MS || `${15 * MINUTE_MS}`, 10);
const AUTH_THROTTLE_CLEANUP_INTERVAL_MS = parseInt(process.env.AUTH_THROTTLE_CLEANUP_INTERVAL_MS || `${MINUTE_MS}`, 10);

let lastAuthThrottleCleanupAt = 0;

const getSubmittedUsername = (username) => {
  if (typeof username !== 'string') {
    return '';
  }
  return username.trim();
};

const cleanupExpiredAuthEntries = () => {
  const now = Date.now();
  if (now - lastAuthThrottleCleanupAt < AUTH_THROTTLE_CLEANUP_INTERVAL_MS) {
    return;
  }

  cleanupExpiredThrottleState({ now });
  lastAuthThrottleCleanupAt = now;
};

export const createAuthRateLimiter = (routeKey) => async (request, reply) => {
  const now = Date.now();
  cleanupExpiredAuthEntries();

  const key = buildRateLimitKey(routeKey, request);
  const state = consumeRateLimit({
    stateKey: key,
    now,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS
  });

  if (state.count > AUTH_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((state.expiresAt - now) / 1000);
    reply.header('Retry-After', String(Math.max(retryAfterSeconds, 1)));
    return reply.code(429).send({ error: 'Too many authentication requests. Please try again later.' });
  }
};

const getLoginAttemptState = (username, ip) => {
  const { accountKey, ipKey } = buildLoginAttemptKeySet(username, ip);

  return {
    accountKey,
    ipKey,
    account: accountKey ? getThrottleState(accountKey) : null,
    byIp: ipKey ? getThrottleState(ipKey) : null
  };
};

const resetLoginAttempts = (username, ip) => {
  for (const key of buildLoginAttemptKeys(username, ip)) {
    deleteThrottleState(key);
  }
};

const registerFailedLogin = (username, ip) => {
  const now = Date.now();
  cleanupExpiredAuthEntries();

  for (const key of buildLoginAttemptKeys(username, ip)) {
    registerFailedLoginAttempt({
      stateKey: key,
      now,
      attemptWindowMs: LOGIN_ATTEMPT_WINDOW_MS,
      maxFailedAttempts: LOGIN_MAX_FAILED_ATTEMPTS,
      lockoutMs: LOGIN_LOCKOUT_MS
    });
  }
};

const ensureLoginNotLocked = (request, reply, username) => {
  const now = Date.now();
  const ip = getClientIp(request);
  const { account, byIp } = getLoginAttemptState(username, ip);
  const activeLocks = [account?.lockUntil, byIp?.lockUntil]
    .filter((value) => typeof value === 'number' && value > now);

  if (activeLocks.length === 0) {
    return true;
  }

  const nearestUnlockTs = Math.min(...activeLocks);
  const retryAfterSeconds = Math.ceil((nearestUnlockTs - now) / 1000);
  reply.header('Retry-After', String(Math.max(retryAfterSeconds, 1)));
  reply.code(429);
  return reply.view('pages/admin/login', {
    title: 'Админ Вход',
    error: 'Слишком много неудачных попыток входа. Повторите позже.',
    username: getSubmittedUsername(username),
    csrfToken: ensureCsrfToken(request)
  });
};

const renderLoginPage = (request, reply, error = null, username = '') => reply.view('pages/admin/login', {
  title: 'Админ Вход',
  error,
  username: getSubmittedUsername(username),
  csrfToken: ensureCsrfToken(request)
});

const regenerateSession = (request) => new Promise((resolve, reject) => {
  if (!request.session || typeof request.session.regenerate !== 'function') {
    resolve();
    return;
  }

  request.session.regenerate((error) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
});

const destroySession = (request) => new Promise((resolve, reject) => {
  try { clearAdminSession(request); } catch {
    // Session cleanup is best-effort here.
  }

  if (!request.session || typeof request.session.destroy !== 'function') {
    resolve();
    return;
  }

  request.session.destroy((error) => {
    try { clearAdminSession(request); } catch {
      // Session cleanup is best-effort here.
    }
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
});

const rejectInvalidCsrf = (request, reply, bodyOverride = null) => {
  const candidateToken = getCsrfTokenFromRequest(request, bodyOverride);
  if (verifyCsrfToken(request, candidateToken)) {
    return false;
  }

  reply.code(403);
  return true;
};

const redirectByAdminSession = (request, reply) => {
  if (isAdminSessionValid(request)) {
    return reply.redirect('/admin/dash');
  }

  clearAdminSession(request);
  return reply.redirect('/admin/login');
};

export const getLoginPage = async (request, reply) => {
  if (request.session.adminId) {
    return redirectByAdminSession(request, reply);
  }
  return renderLoginPage(request, reply, null);
};

export const postLogin = async (request, reply) => {
  const { username, password } = request.body;

  if (rejectInvalidCsrf(request, reply)) {
    return renderLoginPage(request, reply, 'Недействительный токен безопасности. Обновите страницу и попробуйте снова.', username);
  }

  const lockResult = ensureLoginNotLocked(request, reply, username);
  if (lockResult !== true) {
    return lockResult;
  }

  if (!username || !password) {
    return renderLoginPage(request, reply, 'Логин и пароль требуются', username);
  }

  try {
    const adminUser = await verifyAdminCredentials(username, password);
    if (adminUser) {
      resetLoginAttempts(username, getClientIp(request));
      await regenerateSession(request);
      setAdminSession(request, adminUser);
      return reply.redirect('/admin/dash');
    }

    registerFailedLogin(username, getClientIp(request));

    return renderLoginPage(request, reply, 'Неверный логин или пароль', username);
  } catch (error) {
    request.server.log.error(error);
    registerFailedLogin(username, getClientIp(request));
    return renderLoginPage(request, reply, 'Ошибка сервера', username);
  }
};

export const postLogout = async (request, reply) => {
  if (rejectInvalidCsrf(request, reply)) {
    return reply.send({ error: 'Invalid CSRF token' });
  }

  try {
    await destroySession(request);

    try { reply.clearCookie('session'); } catch {
      // Cookie cleanup is best-effort after session destruction.
    }
    try { reply.clearCookie('sessionId'); } catch {
      // Cookie cleanup is best-effort after session destruction.
    }
    try { reply.clearCookie('connect.sid'); } catch {
      // Cookie cleanup is best-effort after session destruction.
    }
  } catch (err) {
    request.server.log.error('Error destroying session during logout', err);
  }

  return reply.redirect('/admin/login');
};

export { ensureInitialAdminUser };

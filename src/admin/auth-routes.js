import {
  verifyAdminCredentials,
  setAdminSession,
  clearAdminSession,
  ensureCsrfToken
} from '../middleware/auth.js';
import { rejectInvalidCsrf, redirectByAdminSession } from './route-helpers.js';

const MINUTE_MS = 60 * 1000;
const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || `${MINUTE_MS}`, 10);
const AUTH_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '30', 10);
const LOGIN_ATTEMPT_WINDOW_MS = parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MS || `${10 * MINUTE_MS}`, 10);
const LOGIN_MAX_FAILED_ATTEMPTS = parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS || '10', 10);
const LOGIN_LOCKOUT_MS = parseInt(process.env.LOGIN_LOCKOUT_MS || `${15 * MINUTE_MS}`, 10);

const authRateLimitStore = new Map();
const loginAttemptStore = new Map();

const getClientIp = (request) => request.ip || request.headers['x-forwarded-for'] || 'unknown';

const getSubmittedUsername = (username) => {
  if (typeof username !== 'string') {
    return '';
  }

  return username.trim();
};

const cleanupExpiredAuthEntries = () => {
  const now = Date.now();

  for (const [key, entry] of authRateLimitStore.entries()) {
    if (entry.windowStart + AUTH_RATE_LIMIT_WINDOW_MS <= now) {
      authRateLimitStore.delete(key);
    }
  }

  for (const [key, entry] of loginAttemptStore.entries()) {
    const lockExpired = !entry.lockUntil || entry.lockUntil <= now;
    const attemptsExpired = !entry.firstAttemptAt || entry.firstAttemptAt + LOGIN_ATTEMPT_WINDOW_MS <= now;
    if (lockExpired && attemptsExpired) {
      loginAttemptStore.delete(key);
    }
  }
};

setInterval(cleanupExpiredAuthEntries, MINUTE_MS).unref();

const createAuthRateLimiter = (routeKey) => async (request, reply) => {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${routeKey}:${ip}`;

  let state = authRateLimitStore.get(key);
  if (!state || now - state.windowStart >= AUTH_RATE_LIMIT_WINDOW_MS) {
    state = {
      windowStart: now,
      count: 0
    };
  }

  state.count += 1;
  authRateLimitStore.set(key, state);

  if (state.count > AUTH_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((state.windowStart + AUTH_RATE_LIMIT_WINDOW_MS - now) / 1000);
    reply.header('Retry-After', String(Math.max(retryAfterSeconds, 1)));
    return reply.code(429).send({ error: 'Too many authentication requests. Please try again later.' });
  }
};

const getLoginAttemptState = (username, ip) => {
  const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
  const accountKey = `acct:${normalizedUsername}`;
  const ipKey = `ip:${ip}`;

  return {
    accountKey,
    ipKey,
    account: loginAttemptStore.get(accountKey) || null,
    byIp: loginAttemptStore.get(ipKey) || null
  };
};

const resetLoginAttempts = (username, ip) => {
  const { accountKey, ipKey } = getLoginAttemptState(username, ip);
  loginAttemptStore.delete(accountKey);
  loginAttemptStore.delete(ipKey);
};

const registerFailedLogin = (username, ip) => {
  const now = Date.now();
  const keys = [];

  if (typeof username === 'string' && username.trim()) {
    keys.push(`acct:${username.trim().toLowerCase()}`);
  }

  keys.push(`ip:${ip}`);

  for (const key of keys) {
    const previous = loginAttemptStore.get(key);
    let attempts = 1;
    let firstAttemptAt = now;

    if (previous && now - previous.firstAttemptAt < LOGIN_ATTEMPT_WINDOW_MS) {
      attempts = previous.attempts + 1;
      firstAttemptAt = previous.firstAttemptAt;
    }

    const lockUntil = attempts >= LOGIN_MAX_FAILED_ATTEMPTS ? now + LOGIN_LOCKOUT_MS : null;

    loginAttemptStore.set(key, {
      attempts,
      firstAttemptAt,
      lockUntil
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
  return reply.view('admin/login', {
    title: 'Админ Вход',
    error: 'Слишком много неудачных попыток входа. Повторите позже.',
    username: getSubmittedUsername(username),
    csrfToken: ensureCsrfToken(request)
  });
};

const authRouteRateLimit = createAuthRateLimiter('admin-auth');

const renderLoginPage = (request, reply, error = null, username = '') => reply.view('admin/login', {
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
  // Clear admin markers in case session methods are not available or before destroying
  try { clearAdminSession(request); } catch (e) {}

  if (!request.session || typeof request.session.destroy !== 'function') {
    resolve();
    return;
  }

  request.session.destroy((error) => {
    try { clearAdminSession(request); } catch (e) {}
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
});

export default async function registerAdminAuthRoutes(fastify) {
  fastify.get('/admin/login', { onRequest: [authRouteRateLimit] }, async (request, reply) => {
    if (request.session.adminId) {
      return redirectByAdminSession(request, reply);
    }
    return renderLoginPage(request, reply, null);
  });

  fastify.post('/admin/login', { onRequest: [authRouteRateLimit] }, async (request, reply) => {
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
        // store numeric admin id in session for better security
        setAdminSession(request, adminUser.id);
        return reply.redirect('/admin/dash');
      }

      registerFailedLogin(username, getClientIp(request));

      return renderLoginPage(request, reply, 'Неверный логин или пароль', username);
    } catch (error) {
      fastify.log.error(error);
      registerFailedLogin(username, getClientIp(request));
      return renderLoginPage(request, reply, 'Ошибка сервера', username);
    }
  });

  fastify.post('/admin/logout', { onRequest: [authRouteRateLimit] }, async (request, reply) => {
    if (rejectInvalidCsrf(request, reply)) {
      return reply.send({ error: 'Invalid CSRF token' });
    }

    try {
      // clear any admin markers on the session and remove persisted session
      await destroySession(request);

      // attempt to clear common session cookie names to remove client cookie
      try { reply.clearCookie('session'); } catch (e) {}
      try { reply.clearCookie('sessionId'); } catch (e) {}
      try { reply.clearCookie('connect.sid'); } catch (e) {}
    } catch (err) {
      fastify.log.error('Error destroying session during logout', err);
    }

    return reply.redirect('/admin/login');
  });
}

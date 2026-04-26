import argon2 from 'argon2';
import { randomBytes, timingSafeEqual } from 'crypto';
import { adminUsers } from '../../db/db.js';

const CSRF_SESSION_KEY = 'csrfToken';
const CSRF_FORM_FIELD = '_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

export const isAdmin = async (request, reply) => {
  const session = request.session;
  
  if (!session.adminId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
};

export const setAdminSession = (request, adminId) => {
  request.session.adminId = adminId;
  request.session.adminLoginTime = Date.now();
};

export const clearAdminSession = (request) => {
  delete request.session.adminId;
  delete request.session.adminLoginTime;
};

export const isAdminLoggedIn = (request) => {
  return !!request.session.adminId;
};

const normalizeToken = (token) => {
  if (typeof token !== 'string') return '';
  return token.trim();
};

export const ensureCsrfToken = (request) => {
  const current = normalizeToken(request.session?.[CSRF_SESSION_KEY]);
  if (current) {
    return current;
  }

  const next = randomBytes(32).toString('hex');
  request.session[CSRF_SESSION_KEY] = next;
  return next;
};

export const getCsrfTokenFromRequest = (request, bodyOverride = null) => {
  const headerValue = request.headers?.[CSRF_HEADER_NAME];
  const headerToken = normalizeToken(Array.isArray(headerValue) ? headerValue[0] : headerValue);
  if (headerToken) {
    return headerToken;
  }

  const body = bodyOverride && typeof bodyOverride === 'object' ? bodyOverride : request.body;
  if (body && typeof body === 'object') {
    const bodyToken = normalizeToken(body[CSRF_FORM_FIELD]);
    if (bodyToken) {
      return bodyToken;
    }
  }

  return '';
};

export const verifyCsrfToken = (request, candidateToken) => {
  const expected = normalizeToken(request.session?.[CSRF_SESSION_KEY]);
  const provided = normalizeToken(candidateToken);

  if (!expected || !provided || expected.length !== provided.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
};

export const requireCsrfToken = async (request, reply) => {
  const token = getCsrfTokenFromRequest(request);
  if (verifyCsrfToken(request, token)) {
    return;
  }

  return reply.code(403).send({ error: 'Invalid CSRF token' });
};

const normalize = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

export const ensureInitialAdminUser = async () => {
  if (adminUsers.exists()) {
    return { created: false };
  }

  const username = normalize(process.env.ADMIN_USERNAME);
  const password = process.env.ADMIN_PASSWORD;

  if (!username) {
    throw new Error('ADMIN_USERNAME is required when no admin users exist');
  }

  if (!password) {
    throw new Error('No admin users exist. Set ADMIN_PASSWORD to create the initial admin user');
  }

  const passwordHash = await argon2.hash(password);
  adminUsers.create(username, passwordHash);

  return { created: true, username };
};

export const verifyAdminCredentials = async (username, password) => {
  const login = normalize(username);
  if (!login || typeof password !== 'string' || !password) {
    return false;
  }

  const adminUser = adminUsers.getByUsername(login);
  if (!adminUser?.password_hash) {
    return false;
  }

  return argon2.verify(adminUser.password_hash, password);
};

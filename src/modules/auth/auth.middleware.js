import { randomBytes, timingSafeEqual } from 'crypto';
import { adminUsers } from '../../../db/db.js';

const CSRF_SESSION_KEY = 'csrfToken';
const CSRF_FORM_FIELD = '_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

export const isAdmin = async (request, reply) => {
  if (!isAdminSessionValid(request)) {
    clearAdminSession(request);
    return reply.status(401).send({ error: 'Unauthorized' });
  }
};

export const setAdminSession = (request, adminUser) => {
  request.session.adminId = adminUser.id;
  request.session.adminLoginTime = Date.now();
  request.session.adminPasswordUpdatedAt = adminUser.updated_at || null;
};

export const clearAdminSession = (request) => {
  if (!request.session) {
    return;
  }

  delete request.session.adminId;
  delete request.session.adminLoginTime;
  delete request.session.adminPasswordUpdatedAt;
};

export const isAdminLoggedIn = (request) => {
  return isAdminSessionValid(request);
};

export const isAdminSessionValid = (request) => {
  const adminId = request.session?.adminId;
  if (!Number.isInteger(adminId) || adminId <= 0) {
    return false;
  }

  const adminUser = adminUsers.getById(adminId);
  if (!adminUser) {
    return false;
  }

  return request.session.adminPasswordUpdatedAt === (adminUser.updated_at || null);
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

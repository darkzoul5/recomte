import {
  getCsrfTokenFromRequest,
  verifyCsrfToken,
  isAdminSessionValid,
  clearAdminSession
} from '../auth/auth.middleware.js';

export const rejectInvalidCsrf = (request, reply, bodyOverride = null) => {
  const candidateToken = getCsrfTokenFromRequest(request, bodyOverride);
  if (verifyCsrfToken(request, candidateToken)) {
    return false;
  }

  reply.code(403);
  return true;
};

export const requireAdminSession = (request, reply) => {
  if (isAdminSessionValid(request)) {
    return true;
  }

  clearAdminSession(request);
  reply.redirect('/admin/login');
  return false;
};

export const redirectByAdminSession = (request, reply) => {
  if (isAdminSessionValid(request)) {
    return reply.redirect('/admin/dash');
  }

  clearAdminSession(request);
  return reply.redirect('/admin/login');
};

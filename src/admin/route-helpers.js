import { getCsrfTokenFromRequest, verifyCsrfToken } from '../middleware/auth.js';

export const rejectInvalidCsrf = (request, reply, bodyOverride = null) => {
  const candidateToken = getCsrfTokenFromRequest(request, bodyOverride);
  if (verifyCsrfToken(request, candidateToken)) {
    return false;
  }

  reply.code(403);
  return true;
};

export const requireAdminSession = (request, reply) => {
  if (request.session && request.session.adminId) {
    return true;
  }

  reply.redirect('/admin/login');
  return false;
};

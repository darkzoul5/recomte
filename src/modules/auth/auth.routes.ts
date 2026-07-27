import {
  getLoginPage,
  postLogin,
  postLogout,
  createAuthRateLimiter
} from './auth.controller.ts';

export default async function registerAuthRoutes(fastify) {
  const authRouteRateLimit = createAuthRateLimiter('admin-auth');

  fastify.get('/admin/login', { onRequest: [authRouteRateLimit] }, getLoginPage);
  fastify.post('/admin/login', { onRequest: [authRouteRateLimit] }, postLogin);
  fastify.post('/admin/logout', { onRequest: [authRouteRateLimit] }, postLogout);
}

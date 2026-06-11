import {
  getDashboard,
  getEditPage,
  getNewPage,
  postCreateCaravan,
  postUpdateCaravan,
  postDelistCaravan,
  postRelistCaravan,
  postDeleteCaravan
} from './admin.controller.js';
import { redirectByAdminSession } from './admin.helpers.js';
import { clearAdminSession, ensureCsrfToken, isAdminSessionValid } from '../auth/auth.middleware.js';

export default async function registerAdminRoutes(fastify, options = {}) {
  // Redirect root admin paths by session status
  fastify.get('/', async (request, reply) => {
    return redirectByAdminSession(request, reply);
  });

  fastify.get('/admin', async (request, reply) => {
    return redirectByAdminSession(request, reply);
  });

  // Dashboard
  fastify.get('/admin/dash', async (request, reply) => {
    return getDashboard(request, reply, fastify);
  });

  // Edit caravan form
  fastify.get('/admin/edit/:id', async (request, reply) => {
    return getEditPage(request, reply, fastify);
  });

  // New caravan form
  fastify.get('/admin/new', async (request, reply) => {
    return getNewPage(request, reply);
  });

  // Create caravan
  fastify.post('/admin/new', async (request, reply) => {
    return postCreateCaravan(request, reply, fastify);
  });

  // Update caravan
  fastify.post('/admin/edit/:id', async (request, reply) => {
    return postUpdateCaravan(request, reply, fastify);
  });

  // Delist caravan (hide)
  fastify.post('/admin/edit/:id/delist', async (request, reply) => {
    return postDelistCaravan(request, reply);
  });

  // Relist caravan (show)
  fastify.post('/admin/edit/:id/relist', async (request, reply) => {
    return postRelistCaravan(request, reply);
  });

  // Delete caravan
  fastify.post('/admin/delete/:id', async (request, reply) => {
    return postDeleteCaravan(request, reply);
  });

  fastify.all('/admin/*', async (request, reply) => {
    if (request.url.startsWith('/admin/api/')) {
      return reply.code(404).send({ error: 'Not found' });
    }

    if (!isAdminSessionValid(request)) {
      clearAdminSession(request);
      return reply.redirect('/admin/login');
    }

    return reply.code(404).view('pages/admin/404', {
      title: 'Страница не найдена',
      csrfToken: ensureCsrfToken(request)
    });
  });
}

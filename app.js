import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/db.js';
import caravansRoutes from './src/routes/caravans.js';
import adminRoutes from './src/routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development'
});

// Initialize and start server
(async () => {
  try {
    // Initialize database
    await initDb();

    // Register plugins
    await fastify.register(fastifyCookie);

    await fastify.register(fastifySession, {
      secret: process.env.SESSION_SECRET || 'default_secret_change_in_production',
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
      }
    });

    // Serve static files from public directory
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, 'public'),
      prefix: '/public/'
    });

    // Register EJS template engine
    const fastifyView = (await import('@fastify/view')).default;
    await fastify.register(fastifyView, {
      engine: {
        ejs: (await import('ejs')).default
      },
      root: path.join(__dirname, 'views')
    });

    // Health check
    fastify.get('/health', async (request, reply) => {
      return { status: 'ok' };
    });

    // ===== PAGE ROUTES (Server-Rendered) =====

    // Homepage
    fastify.get('/', async (request, reply) => {
      try {
        const response = await fastify.inject({
          method: 'GET',
          url: '/api/featured-caravans'
        });
        const data = JSON.parse(response.body);
        return reply.view('home', { title: 'Главная', caravans: data.caravans || [] });
      } catch (err) {
        fastify.log.error(err);
        return reply.view('home', { title: 'Главная', caravans: [] });
      }
    });

// Caravan catalogue
fastify.get('/caravans', async (request, reply) => {
  try {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/caravans'
    });
    const data = JSON.parse(response.body);
    return reply.view('catalogue', { title: 'Каталог', caravans: data.caravans || [] });
  } catch (err) {
    fastify.log.error(err);
    return reply.view('catalogue', { title: 'Каталог', caravans: [] });
  }
});

// Single caravan detail
fastify.get('/caravans/:slug', async (request, reply) => {
  try {
    const response = await fastify.inject({
      method: 'GET',
      url: `/api/caravans/${request.params.slug}`
    });
    
    if (response.statusCode === 404) {
      return reply.code(404).send({ message: 'Caravan not found' });
    }
    
    const caravan = JSON.parse(response.body);
    return reply.view('caravan', { title: caravan.title, caravan });
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ message: 'Error loading caravan' });
  }
});

// Contact page
    fastify.get('/contact', async (request, reply) => {
      return reply.view('contact', { title: 'Контакты' });
    });

    // Register API routes
    await fastify.register(caravansRoutes);
    await fastify.register(adminRoutes);

// Graceful shutdown
const closeGracefully = async (signal) => {
  fastify.log.info(`Received ${signal}, closing gracefully`);
  closeDb();
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

// Start server
    const start = async () => {
      try {
        const host = process.env.HOST || '0.0.0.0';
        const port = parseInt(process.env.PORT || 3000);

        await fastify.listen({ host, port });
        fastify.log.info(`🚀 Server running at http://${host}:${port}`);
      } catch (err) {
        fastify.log.error(err);
        process.exit(1);
      }
    };

    await start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/db.js';
import { createServer, registerCommonPlugins } from './src/server/setup.js';
import publicPagesRoutes from './src/routes/public-pages.js';
import caravansRoutes from './src/routes/caravans.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = createServer();

(async () => {
  try {
    initDb();

    await registerCommonPlugins(fastify, { rootDir: __dirname });

    fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

    await fastify.register(caravansRoutes);
    await fastify.register(publicPagesRoutes);

    fastify.get('*', async (request, reply) => {
      return reply.code(404).view('404');
    });

    fastify.post('*', async (request, reply) => {
      return reply.code(404).view('404');
    });

    const closeGracefully = async (signal) => {
      fastify.log.info(`Received ${signal}, closing gracefully`);
      closeDb();
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));

    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3000', 10);

    await fastify.listen({ host, port });
    fastify.log.info(`🚀 Public server running at http://${host}:${port}`);
  } catch (error) {
    console.error('Failed to start public server:', error);
    process.exit(1);
  }
})();
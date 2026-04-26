import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/db.js';
import { createServer, registerCommonPlugins } from './src/server/setup.js';
import adminRoutes from './src/routes/admin.js';
import { ensureInitialAdminUser } from './src/middleware/auth.js';
import registerAdminAuthRoutes from './src/admin/auth-routes.js';
import registerAdminPageRoutes from './src/admin/page-routes.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = createServer();

(async () => {
  try {
    initDb();

    const bootstrapResult = await ensureInitialAdminUser();
    if (bootstrapResult.created) {
      fastify.log.warn(`Bootstrap admin user created: ${bootstrapResult.username}`);
    }

    await registerCommonPlugins(fastify, { rootDir: __dirname, isAdminServer: true });

    fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

    await fastify.register(adminRoutes);
    await registerAdminAuthRoutes(fastify);
    await registerAdminPageRoutes(fastify, { rootDir: __dirname });

    const closeGracefully = async (signal) => {
      fastify.log.info(`Received ${signal}, closing gracefully`);
      closeDb();
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));

    const host = process.env.ADMIN_HOST || '0.0.0.0';
    const port = parseInt(process.env.ADMIN_PORT || '3001', 10);

    await fastify.listen({ host, port });
    fastify.log.info(`🔒 Admin server running at http://${host}:${port}`);
  } catch (error) {
    console.error('Failed to start admin server:', error);
    process.exit(1);
  }
})();
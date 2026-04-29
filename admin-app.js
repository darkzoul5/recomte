import dotenv from 'dotenv';
import { validateEnv, validators } from './src/utils/env.js';
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

// Validate critical environment variables early and fail-fast if misconfigured
validateEnv([
  { name: 'SESSION_SECRET', required: true, validate: validators.minLength(32), message: 'SESSION_SECRET must be set and at least 32 characters', sensitive: true },
  { name: 'NODE_ENV', required: true, validate: validators.oneOf(['development', 'production', 'test']), message: 'NODE_ENV must be one of development, production or test' },
  { name: 'ADMIN_USERNAME', required: true, validate: validators.requiredNonEmpty, message: 'ADMIN_USERNAME must be set' },
  { name: 'ADMIN_PASSWORD', required: true, validate: validators.minLength(8), message: 'ADMIN_PASSWORD must be set and at least 8 characters', sensitive: true }
]);
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
import dotenv from 'dotenv';
import { validateEnv, validators } from '../utils/env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer, registerCommonPlugins } from './setup.js';
import adminRoutes from '../routes/admin.js';
import { ensureInitialAdminUser } from '../modules/auth/index.js';
import { registerAuthRoutes } from '../modules/auth/index.js';
import { registerAdminRoutes } from '../modules/admin/index.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');

export const validateAdminServerEnv = () => {
  validateEnv([
    {
      name: 'SESSION_SECRET',
      required: true,
      validate: validators.minLength(32),
      message: 'SESSION_SECRET must be set and at least 32 characters',
      sensitive: true
    },
    {
      name: 'NODE_ENV',
      required: true,
      validate: validators.oneOf(['development', 'production', 'test']),
      message: 'NODE_ENV must be one of development, production or test'
    },
    {
      name: 'ADMIN_USERNAME',
      required: true,
      validate: validators.requiredNonEmpty,
      message: 'ADMIN_USERNAME must be set'
    },
    {
      name: 'ADMIN_PASSWORD',
      required: true,
      validate: validators.minLength(12),
      message: 'ADMIN_PASSWORD must be set and at least 12 characters',
      sensitive: true
    }
  ]);
};

export const buildAdminServer = async () => {
  const fastify = createServer();

  await registerCommonPlugins(fastify, { rootDir: projectRoot, isAdminServer: true });

  const bootstrapResult = await ensureInitialAdminUser();
  if (bootstrapResult.created) {
    fastify.log.warn(`Bootstrap admin user created: ${bootstrapResult.username}`);
  } else if (bootstrapResult.updated) {
    fastify.log.warn(`Bootstrap admin password updated from ADMIN_PASSWORD for: ${bootstrapResult.username}`);
  }

  fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

  await fastify.register(adminRoutes);
  await registerAuthRoutes(fastify);
  await registerAdminRoutes(fastify, { rootDir: projectRoot });

  return fastify;
};

export const startAdminServer = async () => {
  validateAdminServerEnv();

  const fastify = await buildAdminServer();

  const host = process.env.ADMIN_HOST || '0.0.0.0';
  const port = parseInt(process.env.ADMIN_PORT || '3001', 10);

  await fastify.listen({ host, port });
  fastify.log.info(`Admin server running at http://${host}:${port}`);

  return fastify;
};

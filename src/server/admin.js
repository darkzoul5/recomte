import './bootstrap-env.js';
import { validateEnv, validators } from '../utils/env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer, registerCommonPlugins } from './setup.js';
import { ensureInitialAdminUser } from '../modules/auth/index.js';
import { registerAuthRoutes } from '../modules/auth/index.js';
import { registerAdminApiRoutes, registerAdminRoutes } from '../modules/admin/index.js';

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
  const fastify = createServer(true);

  await registerCommonPlugins(fastify, { rootDir: projectRoot, isAdminServer: true });

  const bootstrapResult = await ensureInitialAdminUser();
  if (bootstrapResult.created) {
    fastify.log.warn({ username: bootstrapResult.username }, 'Bootstrap admin user created');
  } else if (bootstrapResult.updated) {
    fastify.log.warn({ username: bootstrapResult.username }, 'Bootstrap admin password updated from ADMIN_PASSWORD');
  }

  fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

  await fastify.register(registerAdminApiRoutes);
  await registerAuthRoutes(fastify);
  await registerAdminRoutes(fastify, { rootDir: projectRoot });

  return fastify;
};

export const startAdminServer = async () => {
  validateAdminServerEnv();

  const fastify = await buildAdminServer();

  const host = process.env.ADMIN_HOST || '0.0.0.0';
  const port = parseInt(process.env.ADMIN_PORT || '3001', 10);

  const baseLevel = fastify.log.level;
  fastify.log.level = 'silent';

  try {
    await fastify.listen({ host, port });
  } finally {
    fastify.log.level = baseLevel;
  }

  fastify.log.info({ host, port }, 'Admin server started');

  return fastify;
};

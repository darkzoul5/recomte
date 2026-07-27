import './bootstrap-env.ts';
import { validateEnv, validators } from '../utils/env.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer, registerCommonPlugins } from './setup.ts';
import { registerCaravansRoutes } from '../modules/caravans/index.ts';
import { registerPagesRoutes } from '../modules/pages/index.ts';
import { registerSitemapRoutes } from '../modules/sitemap/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');

export const validatePublicServerEnv = () => {
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
    }
  ]);
};

export const buildPublicServer = async () => {
  const fastify = createServer(false);

  await registerCommonPlugins(fastify, { rootDir: projectRoot, isAdminServer: false });

  fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

  await registerCaravansRoutes(fastify);
  await registerPagesRoutes(fastify);
  await registerSitemapRoutes(fastify);

  fastify.get('*', async (request, reply) => {
    return reply.code(404).view('pages/errors/404');
  });

  fastify.post('*', async (request, reply) => {
    return reply.code(404).view('pages/errors/404');
  });

  return fastify;
};

export const startPublicServer = async () => {
  validatePublicServerEnv();

  const fastify = await buildPublicServer();

  const host = process.env.HOST || '0.0.0.0';
  const port = parseInt(process.env.PORT || '3000', 10);

  const baseLevel = fastify.log.level;
  fastify.log.level = 'silent';

  try {
    await fastify.listen({ host, port });
  } finally {
    fastify.log.level = baseLevel;
  }

  fastify.log.info({ host, port }, 'Public server started');

  return fastify;
};

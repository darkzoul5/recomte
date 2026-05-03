import dotenv from 'dotenv';
import { validateEnv, validators } from '../utils/env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer, registerCommonPlugins } from './setup.js';
import publicPagesRoutes from '../routes/public-pages.js';
import caravansRoutes from '../routes/caravans.js';
import sitemapRoutes from '../routes/sitemap.js';

dotenv.config({ override: false });

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
  const fastify = createServer();

  await registerCommonPlugins(fastify, { rootDir: projectRoot, isAdminServer: false });

  fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

  await fastify.register(caravansRoutes);
  await fastify.register(publicPagesRoutes);
  await fastify.register(sitemapRoutes);

  fastify.get('*', async (request, reply) => {
    return reply.code(404).view('404');
  });

  fastify.post('*', async (request, reply) => {
    return reply.code(404).view('404');
  });

  return fastify;
};

export const startPublicServer = async () => {
  validatePublicServerEnv();

  const fastify = await buildPublicServer();

  const host = process.env.HOST || '0.0.0.0';
  const port = parseInt(process.env.PORT || '3000', 10);

  await fastify.listen({ host, port });
  fastify.log.info(`Public server running at http://${host}:${port}`);

  return fastify;
};

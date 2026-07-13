import './bootstrap-env.js';
import { initDb, closeDb } from '../../db/db.js';
import { validatePublicServerEnv, buildPublicServer } from './public.js';
import { validateAdminServerEnv, buildAdminServer } from './admin.js';

const DEFAULT_MODE = 'all';
const getServerMode = () => (process.env.SERVER_MODE || DEFAULT_MODE).toLowerCase();

const getBootstrapLogger = (servers) => servers.find((server) => server && server.log)?.log || console;

const closeServers = async (servers, logger) => {
  for (const server of servers) {
    if (server && typeof server.close === 'function') {
      try {
        await server.close();
      } catch (error) {
        logger.error({ err: error }, 'Failed to close server cleanly');
      }
    }
  }
  closeDb();
};

const attachSignalHandlers = (servers) => {
  const logger = getBootstrapLogger(servers);

  const closeGracefully = async (signal) => {
    logger.info({ signal }, `Received ${signal}, shutting down servers...`);
    await closeServers(servers, logger);
    process.exit(0);
  };

  process.on('SIGINT', () => closeGracefully('SIGINT'));
  process.on('SIGTERM', () => closeGracefully('SIGTERM'));
};

const start = async () => {
  await initDb();

  const mode = getServerMode();
  const servers = [];

  if (mode === 'public' || mode === 'all') {
    validatePublicServerEnv();
  }

  if (mode === 'admin' || mode === 'all') {
    validateAdminServerEnv();
  }

  attachSignalHandlers(servers);

  try {
    if (mode === 'public' || mode === 'all') {
      const publicServer = await buildPublicServer();
      servers.push(publicServer);
      const publicHost = process.env.HOST || '0.0.0.0';
      const publicPort = parseInt(process.env.PORT || '3000', 10);
      await publicServer.listen({ host: publicHost, port: publicPort });
      publicServer.log.info({ host: publicHost, port: publicPort }, `Public server running at http://${publicHost}:${publicPort}`);
    }

    if (mode === 'admin' || mode === 'all') {
      const adminServer = await buildAdminServer();
      servers.push(adminServer);
      const adminHost = process.env.ADMIN_HOST || '0.0.0.0';
      const adminPort = parseInt(process.env.ADMIN_PORT || '3001', 10);
      await adminServer.listen({ host: adminHost, port: adminPort });
      adminServer.log.info({ host: adminHost, port: adminPort }, `Admin server running at http://${adminHost}:${adminPort}`);
    }

    if (mode === 'all') {
      getBootstrapLogger(servers).info('Both public and admin servers are started.');
    }
  } catch (error) {
    getBootstrapLogger(servers).error({ err: error }, 'Failed to start server(s)');
    await closeServers(servers, getBootstrapLogger(servers));
    process.exit(1);
  }
};

start();

import './bootstrap-env.js';
import { initDb, closeDb } from '../../db/db.js';
import { startPublicServer } from './public.js';
import { startAdminServer } from './admin.js';

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

  attachSignalHandlers(servers);

  try {
    if (mode === 'public' || mode === 'all') {
      const publicServer = await startPublicServer();
      servers.push(publicServer);
    }

    if (mode === 'admin' || mode === 'all') {
      const adminServer = await startAdminServer();
      servers.push(adminServer);
    }
  } catch (error) {
    getBootstrapLogger(servers).error({ err: error }, 'Failed to start server(s)');
    await closeServers(servers, getBootstrapLogger(servers));
    process.exit(1);
  }
};

start();

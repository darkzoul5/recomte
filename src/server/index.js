import './bootstrap-env.js';
import { initDb, closeDb } from '../../db/db.js';
import { validatePublicServerEnv, buildPublicServer } from './public.js';
import { validateAdminServerEnv, buildAdminServer } from './admin.js';

const DEFAULT_MODE = 'all';
const getServerMode = () => (process.env.SERVER_MODE || DEFAULT_MODE).toLowerCase();

const closeServers = async (servers) => {
  for (const server of servers) {
    if (server && typeof server.close === 'function') {
      try {
        await server.close();
      } catch (error) {
        console.error('Failed to close server cleanly:', error);
      }
    }
  }
  closeDb();
};

const attachSignalHandlers = (servers) => {
  const closeGracefully = async (signal) => {
    console.info(`Received ${signal}, shutting down servers...`);
    await closeServers(servers);
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
      publicServer.log.info(`Public server running at http://${publicHost}:${publicPort}`);
    }

    if (mode === 'admin' || mode === 'all') {
      const adminServer = await buildAdminServer();
      servers.push(adminServer);
      const adminHost = process.env.ADMIN_HOST || '0.0.0.0';
      const adminPort = parseInt(process.env.ADMIN_PORT || '3001', 10);
      await adminServer.listen({ host: adminHost, port: adminPort });
      adminServer.log.info(`Admin server running at http://${adminHost}:${adminPort}`);
    }

    if (mode === 'all') {
      console.info('Both public and admin servers are started.');
    }
  } catch (error) {
    console.error('Failed to start server(s):', error);
    await closeServers(servers);
    process.exit(1);
  }
};

start();

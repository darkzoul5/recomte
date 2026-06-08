import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyMultipart from '@fastify/multipart';
import fastifyCompress from '@fastify/compress';
import path from 'path';
import fs from 'fs';
import { getDb } from '../../db/db.js';
import { createAppLogger } from './logger.js';

const SESSION_MAX_AGE = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const SESSION_CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export const createServer = (isAdminServer = false) => {
  const logLevel = isAdminServer
    ? (process.env.ADMIN_LOG_LEVEL || process.env.LOG_LEVEL || 'info')
    : (process.env.PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL || 'info');

  return Fastify({
    loggerInstance: createAppLogger(logLevel, { scope: isAdminServer ? 'admin' : 'public' }),
    disableRequestLogging: true,
    trustProxy: true
  });
};

const getAllowedPublicFrameAncestors = () => {
  const values = new Set();
  const configuredOrigins = String(process.env.PUBLIC_FRAME_ANCESTORS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  configuredOrigins.forEach((origin) => values.add(origin));

  if (process.env.NODE_ENV !== 'production') {
    const adminPort = process.env.ADMIN_PORT || '3001';
    values.add(`http://localhost:${adminPort}`);
    values.add(`http://127.0.0.1:${adminPort}`);
  }

  return Array.from(values);
};

class SqliteSessionStore {
  constructor(maxAge) {
    this.maxAge = maxAge;
    this.db = getDb();

    this.upsertStmt = this.db.prepare(
      `INSERT INTO sessions (session_id, data, expires_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(session_id)
       DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at, updated_at = CURRENT_TIMESTAMP`
    );
    this.selectStmt = this.db.prepare(
      'SELECT data, expires_at FROM sessions WHERE session_id = ? LIMIT 1'
    );
    this.deleteStmt = this.db.prepare('DELETE FROM sessions WHERE session_id = ?');
    this.cleanupStmt = this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?');

    this.cleanupTimer = setInterval(() => {
      try {
        this.cleanupExpired();
      } catch {
        // Cleanup failures should not break request handling.
      }
    }, SESSION_CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  cleanupExpired() {
    this.cleanupStmt.run(Date.now());
  }

  async set(sessionId, session, callback) {
    try {
      this.upsertStmt.run(sessionId, JSON.stringify(session), Date.now() + this.maxAge);
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
      throw error;
    }
  }

  async get(sessionId, callback) {
    try {
      const row = this.selectStmt.get(sessionId);
      if (!row) {
        if (callback) callback(null, null);
        return null;
      }

      if (row.expires_at <= Date.now()) {
        this.deleteStmt.run(sessionId);
        if (callback) callback(null, null);
        return null;
      }

      const sessionData = JSON.parse(row.data);
      if (callback) callback(null, sessionData);
      return sessionData;
    } catch (error) {
      if (callback) callback(error, null);
      throw error;
    }
  }

  async destroy(sessionId, callback) {
    try {
      this.deleteStmt.run(sessionId);
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
      throw error;
    }
  }
}

const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (typeof secret !== 'string' || secret.trim().length < 32) {
    throw new Error('SESSION_SECRET is required and must be at least 32 characters long');
  }
  return secret;
};

export const registerCommonPlugins = async (fastify, { rootDir, isAdminServer = false }) => {
  const loadVersionInfo = () => {
    try {
      const filePath = path.join(rootDir, 'version.json');
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const env = data.env;
      const version = data.version;
      const commit = data.commit || null;
      let text = '';
      if (env === 'prod') {
        text = version;
      } else {
        const short = commit || 'unknown';
        text = `${version} | ${short}`;
      }
      return { env, version, commit, text };
    } catch {
      const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
      const fallback = env === 'prod' ? { env, version: 'unknown', commit: null, text: '' } : { env, version: 'dev', commit: null, text: 'dev' };
      return fallback;
    }
  };

  const appVersion = loadVersionInfo();
  await fastify.register(fastifyCompress, {
    threshold: 1024,
    encodings: ['gzip', 'deflate']
  });
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyFormbody);
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: MAX_FILE_SIZE
    }
  });

  const store = new SqliteSessionStore(SESSION_MAX_AGE);
  const sessionSecret = getSessionSecret();

  await fastify.register(fastifySession, {
    store: store,
    secret: sessionSecret,
    saveUninitialized: false,
    cookie: {
      maxAge: SESSION_MAX_AGE,
      secure: process.env.NODE_ENV !== 'development',
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    }
  });

  const frameAncestors = isAdminServer
    ? ["'self'"]
    : ["'self'", ...getAllowedPublicFrameAncestors()];

  const cspHeader = [
    "default-src 'self'",
    "img-src 'self' https: data: blob:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' https: ",
    "connect-src 'self' https://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.com/solid.ws",
    "worker-src 'self' blob: https:",
    "font-src 'self' https: data:",
    "frame-src 'self' https://yandex.ru",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors.join(' ')}`
  ].join('; ');

  const permissionsPolicyHeader = [
    'geolocation=()',
    'camera=()',
    'microphone=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'fullscreen=(self "https://umap.openstreetmap.fr")'
  ].join(', ');

  const shouldSetNoIndex = isAdminServer || process.env.NODE_ENV !== 'production';

  fastify.addHook('onRequest', async (request, reply) => {
    const forwardedProto = request.headers['x-forwarded-proto'];
    const protocol = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : (forwardedProto || '').split(',')[0].trim();

    if (protocol && protocol !== 'https') {
      return reply.redirect(301, `https://${request.headers.host}${request.raw.url}`);
    }
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.removeHeader('server');
    reply.header('X-Content-Type-Options', 'nosniff');
    if (isAdminServer) {
      reply.header('X-Frame-Options', 'SAMEORIGIN');
    } else {
      reply.removeHeader('X-Frame-Options');
    }
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (shouldSetNoIndex) {
      reply.header('X-Robots-Tag', 'noindex, nofollow');
    }
    reply.header('Content-Security-Policy', cspHeader);
    reply.header('Permissions-Policy', permissionsPolicyHeader);
    return payload;
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const url = request.raw.url || request.url || '';
    const statusCode = reply.statusCode || 0;

    if (url === '/healthcheck') {
      return;
    }

    if (url.startsWith('/public/') && statusCode < 400) {
      return;
    }

    const responseTime = typeof reply.elapsedTime === 'number'
      ? `${reply.elapsedTime.toFixed(1)}ms`
      : '';

    const message = `${request.method} ${url} ${statusCode}${responseTime ? ` ${responseTime}` : ''}`;

    if (statusCode >= 500) {
      fastify.log.error(message);
      return;
    }

    if (statusCode >= 400) {
      fastify.log.warn(message);
      return;
    }

    fastify.log.info(message);
  });

  // WebP conversion middleware removed - use static file serving for now
  await fastify.register(fastifyStatic, {
    root: path.join(rootDir, 'public'),
    prefix: '/public/',
    setHeaders: (res, pathName) => {
      // Cache images for 7 days (can be updated by changing file)
      if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(pathName)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      } else if (/\.(woff|woff2|ttf|eot)$/i.test(pathName)) {
        // Fonts: 1 year (rarely change)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (/\.(css|js)$/i.test(pathName)) {
        // Cache CSS/JS for 1 hour (not versioned, changes should deploy quickly)
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      } else {
        // HTML and other files: shorter cache with revalidation
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      }
    }
  });

  await fastify.register(fastifyStatic, {
    root: path.join(rootDir, 'node_modules', 'photoswipe', 'dist'),
    prefix: '/public/vendor/photoswipe/',
    decorateReply: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
  });

  const fastifyView = (await import('@fastify/view')).default;
  await fastify.register(fastifyView, {
    engine: {
      ejs: (await import('ejs')).default
    },
    root: path.join(rootDir, 'views'),
    defaultContext: {
      appVersion
    }
  });
};

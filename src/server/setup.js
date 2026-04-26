import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';
import { getDb } from '../../db/db.js';

const SESSION_MAX_AGE = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const SESSION_CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export const createServer = () => Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  },
  trustProxy: true
});

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

  const cspHeader = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' https:",
    "font-src 'self' https: data:",
    "frame-src 'self' https://www.openstreetmap.org https://*.openstreetmap.org",
    "child-src 'self' https://www.openstreetmap.org https://*.openstreetmap.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
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
    'fullscreen=(self)'
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
    reply.header('X-Frame-Options', 'SAMEORIGIN');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (shouldSetNoIndex) {
      reply.header('X-Robots-Tag', 'noindex, nofollow');
    }
    reply.header('Content-Security-Policy', cspHeader);
    reply.header('Permissions-Policy', permissionsPolicyHeader);
    return payload;
  });

  await fastify.register(fastifyStatic, {
    root: path.join(rootDir, 'public'),
    prefix: '/public/'
  });

  const fastifyView = (await import('@fastify/view')).default;
  await fastify.register(fastifyView, {
    engine: {
      ejs: (await import('ejs')).default
    },
    root: path.join(rootDir, 'views')
  });
};
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';

const SESSION_MAX_AGE = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const createServer = () => Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  },
  trustProxy: true
});

// Simple in-memory session store with proper TTL support
class MemorySessionStore {
  constructor(maxAge) {
    this.sessions = {};
    this.maxAge = maxAge;
  }

  async set(sessionId, session, callback) {
    this.sessions[sessionId] = {
      data: session,
      expires: Date.now() + this.maxAge
    };
    if (callback) callback(null);
  }

  async get(sessionId, callback) {
    const session = this.sessions[sessionId];
    if (!session) {
      if (callback) callback(null, null);
      return null;
    }
    if (session.expires < Date.now()) {
      delete this.sessions[sessionId];
      if (callback) callback(null, null);
      return null;
    }
    if (callback) callback(null, session.data);
    return session.data;
  }

  async destroy(sessionId, callback) {
    delete this.sessions[sessionId];
    if (callback) callback(null);
  }
}

export const registerCommonPlugins = async (fastify, { rootDir }) => {
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyFormbody);
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: MAX_FILE_SIZE
    }
  });

  const store = new MemorySessionStore(SESSION_MAX_AGE);

  await fastify.register(fastifySession, {
    store: store,
    secret: process.env.SESSION_SECRET || 'default_secret_change_in_production',
    saveUninitialized: true,
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
    reply.header('X-Robots-Tag', 'noindex, nofollow');
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
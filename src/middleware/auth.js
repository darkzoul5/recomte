import argon2 from 'argon2';
import { adminUsers } from '../../db/db.js';

export const isAdmin = async (request, reply) => {
  const session = request.session;
  
  if (!session.adminId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
};

export const setAdminSession = (request, adminId) => {
  request.session.adminId = adminId;
  request.session.adminLoginTime = Date.now();
};

export const clearAdminSession = (request) => {
  delete request.session.adminId;
  delete request.session.adminLoginTime;
};

export const isAdminLoggedIn = (request) => {
  return !!request.session.adminId;
};

const normalize = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

export const ensureInitialAdminUser = async () => {
  if (adminUsers.exists()) {
    return { created: false };
  }

  const username = normalize(process.env.ADMIN_USERNAME);
  const password = process.env.ADMIN_PASSWORD;

  if (!username) {
    throw new Error('ADMIN_USERNAME is required when no admin users exist');
  }

  if (!password) {
    throw new Error('No admin users exist. Set ADMIN_PASSWORD to create the initial admin user');
  }

  const passwordHash = await argon2.hash(password);
  adminUsers.create(username, passwordHash);

  return { created: true, username };
};

export const verifyAdminCredentials = async (username, password) => {
  const login = normalize(username);
  if (!login || typeof password !== 'string' || !password) {
    return false;
  }

  const adminUser = adminUsers.getByUsername(login);
  if (!adminUser?.password_hash) {
    return false;
  }

  return argon2.verify(adminUser.password_hash, password);
};

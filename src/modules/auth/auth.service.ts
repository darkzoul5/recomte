import argon2 from 'argon2';
import { adminUsers } from '../../../db/db.ts';

const normalize = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

export const ensureInitialAdminUser = async () => {
  const username = normalize(process.env.ADMIN_USERNAME);
  const password = process.env.ADMIN_PASSWORD;

  if (!username) {
    throw new Error('ADMIN_USERNAME is required to configure the admin user');
  }

  if (!password) {
    throw new Error('ADMIN_PASSWORD is required to configure the admin user');
  }

  const existingUser = adminUsers.getByUsername(username);
  if (existingUser?.password_hash) {
    let passwordMatches = false;
    try {
      passwordMatches = await argon2.verify(existingUser.password_hash, password);
    } catch {
      // Keep passwordMatches false when the stored hash cannot be verified.
    }

    if (passwordMatches) {
      return { created: false, updated: false, username };
    }

    const passwordHash = await argon2.hash(password);
    adminUsers.updatePasswordHash(username, passwordHash);

    return { created: false, updated: true, username };
  }

  if (adminUsers.exists()) {
    const passwordHash = await argon2.hash(password);
    adminUsers.create(username, passwordHash);

    return { created: true, updated: false, username };
  }

  const passwordHash = await argon2.hash(password);
  adminUsers.create(username, passwordHash);

  return { created: true, updated: false, username };
};

export const verifyAdminCredentials = async (username, password) => {
  const login = normalize(username);
  if (!login || typeof password !== 'string' || !password) {
    return null;
  }

  const adminUser = adminUsers.getByUsername(login);
  if (!adminUser?.password_hash) {
    return null;
  }

  try {
    const ok = await argon2.verify(adminUser.password_hash, password);
    return ok ? adminUser : null;
  } catch {
    return null;
  }
};

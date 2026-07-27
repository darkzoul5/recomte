import dotenv from 'dotenv';
import argon2 from 'argon2';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { initDb, closeDb, adminUsers } from '../db/db.ts';

dotenv.config({ override: false });

const main = async () => {
  await initDb();

  const rl = createInterface({ input, output });

  try {
    const username = (await rl.question('Username: ')).trim();
    if (!username) {
      throw new Error('Username is required');
    }

    const existingUser = adminUsers.getByUsername(username);
    if (!existingUser) {
      throw new Error(`Admin user "${username}" was not found`);
    }

    const password = await rl.question('New password: ');
    const passwordConfirm = await rl.question('Confirm new password: ');

    if (!password) {
      throw new Error('Password cannot be empty');
    }

    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters long');
    }

    if (password !== passwordConfirm) {
      throw new Error('Passwords do not match');
    }

    const passwordHash = await argon2.hash(password);
    const updated = adminUsers.updatePasswordHash(username, passwordHash);

    if (!updated) {
      throw new Error('Password update failed');
    }

    console.log(`Password updated for "${username}"`);
  } finally {
    rl.close();
    closeDb();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

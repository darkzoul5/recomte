import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applySchema } from '../db/schema.js';
import { runMigrations } from '../db/migrations/index.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/app.db');

const ensureDir = (filepath) => {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const main = async () => {
  console.log(`Migrating DB at ${dbPath}`);
  ensureDir(dbPath);

  const db = new Database(dbPath);
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');

    applySchema(db);
    await runMigrations(db, { verbose: true, force: true });
  } finally {
    db.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


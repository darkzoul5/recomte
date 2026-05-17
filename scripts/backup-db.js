import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = process.env.DB_PATH || path.join(__dirname, '../data/app.db');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const dbIndex = args.indexOf('--db');

  const out = outIndex >= 0 ? args[outIndex + 1] : null;
  const dbPath = dbIndex >= 0 ? args[dbIndex + 1] : defaultDbPath;

  if (!out) {
    throw new Error('Usage: node scripts/backup-db.js --out <backup-file> [--db <db-file>]');
  }

  return { out, dbPath };
};

const ensureDir = (filepath) => {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const main = async () => {
  const { out, dbPath } = parseArgs();
  ensureDir(out);

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath} (pass --db to override)`);
  }

  const db = new Database(dbPath);
  try {
    db.pragma('busy_timeout = 5000');
    console.log(`Backing up DB: ${dbPath} -> ${out}`);
    await db.backup(out);
    console.log('✓ Backup complete');
  } finally {
    db.close();
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

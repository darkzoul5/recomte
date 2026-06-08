import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getBackupsDir, getDbPath } from '../src/utils/storage-paths.js';

dotenv.config({ override: false });
const defaultDbPath = getDbPath();

const parseArgs = () => {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const dbIndex = args.indexOf('--db');

  const out = outIndex >= 0 ? args[outIndex + 1] : path.join(getBackupsDir(), `app-backup-${Date.now()}.db`);
  const dbPath = dbIndex >= 0 ? args[dbIndex + 1] : defaultDbPath;

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
    throw new Error(`Database file not found: ${dbPath} (pass --db to override, or set STORAGE_ROOT/DB_PATH)`);
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

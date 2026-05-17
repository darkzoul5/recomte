import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isTruthyEnv = (value) => {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const isMigrationsDisabled = () => {
  const value = process.env.MIGRATIONS_AUTO;
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off';
};

const getUserVersion = (db) => {
  try {
    return Number(db.pragma('user_version', { simple: true }) || 0);
  } catch {
    const row = db.prepare('PRAGMA user_version').get();
    return Number(row?.user_version || 0);
  }
};

const setUserVersion = (db, version) => {
  db.pragma(`user_version = ${Number(version)}`);
};

const loadMigrations = async () => {
  const entries = fs.readdirSync(__dirname, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^\d+_.+\.js$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const migrations = [];

  for (const filename of files) {
    const fileUrl = pathToFileURL(path.join(__dirname, filename)).href;
    // eslint-disable-next-line no-await-in-loop
    const mod = await import(fileUrl);
    const migration = mod?.default ?? mod;
    const name = migration?.name ?? mod?.name ?? filename;
    const up = migration?.up ?? mod?.up;

    if (typeof up !== 'function') {
      throw new Error(`Invalid migration ${filename}: missing up(db) function`);
    }

    migrations.push({ filename, name, up });
  }

  return migrations;
};

export const runMigrations = async (db, options = {}) => {
  if (!db) throw new Error('runMigrations(db) requires a database handle');

  if (!options.force && isMigrationsDisabled()) {
    const version = getUserVersion(db);
    return { applied: 0, from: version, to: version, skipped: true };
  }

  const verbose = options.verbose ?? isTruthyEnv(process.env.MIGRATIONS_VERBOSE);

  const migrations = await loadMigrations();
  const currentVersion = getUserVersion(db);

  if (currentVersion > migrations.length) {
    throw new Error(
      `Database schema is newer than this code supports (user_version=${currentVersion}, migrations=${migrations.length}).`
    );
  }

  const targetVersion = migrations.length;

  if (verbose) {
    console.log(`DB migrations: current=${currentVersion}, target=${targetVersion}`);
  }

  let applied = 0;

  for (let index = currentVersion; index < migrations.length; index += 1) {
    const migrationNumber = index + 1;
    const migration = migrations[index];

    if (verbose) {
      console.log(`Applying migration #${migrationNumber}: ${migration.name}`);
    }

    const tx = db.transaction(() => {
      migration.up(db);
    });
    tx();

    setUserVersion(db, migrationNumber);
    applied += 1;
  }

  if (verbose) {
    console.log(`DB migrations: done (user_version=${getUserVersion(db)})`);
  }

  return { applied, from: currentVersion, to: targetVersion, skipped: false };
};


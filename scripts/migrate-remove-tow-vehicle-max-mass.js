import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSchema } from '../db/schema.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/app.db');
const REMOVED_COLUMN = 'tow_vehicle_max_kg';

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

const buildColumnDefinition = (column) => {
  const parts = [quoteIdentifier(column.name)];

  if (column.type) {
    parts.push(column.type);
  }

  if (column.pk) {
    // Preserve AUTOINCREMENT behavior for the primary integer key.
    if (column.name === 'id' && String(column.type || '').toUpperCase() === 'INTEGER') {
      parts.push('PRIMARY KEY AUTOINCREMENT');
    } else {
      parts.push('PRIMARY KEY');
    }
  } else if (column.notnull) {
    parts.push('NOT NULL');
  }

  if (column.dflt_value !== null && column.dflt_value !== undefined) {
    parts.push(`DEFAULT ${column.dflt_value}`);
  }

  return parts.join(' ');
};

const executeSchemaStatements = (db) => {
  const schema = createSchema();
  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }
};

const runMigration = () => {
  if (!fs.existsSync(DB_PATH)) {
    console.log(`[migration] Database not found at ${DB_PATH}. Nothing to migrate.`);
    return;
  }

  const db = new Database(DB_PATH);

  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'caravans'").get();
    if (!tableExists) {
      console.log('[migration] Table caravans does not exist. Nothing to migrate.');
      return;
    }

    const columns = db.prepare("PRAGMA table_info('caravans')").all();
    const hasRemovedColumn = columns.some((column) => column.name === REMOVED_COLUMN);

    if (!hasRemovedColumn) {
      console.log(`[migration] Column ${REMOVED_COLUMN} already removed. Nothing to do.`);
      return;
    }

    const backupPath = `${DB_PATH}.backup-before-remove-${REMOVED_COLUMN}-${Date.now()}`;
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`[migration] Backup created: ${backupPath}`);

    const keptColumns = columns.filter((column) => column.name !== REMOVED_COLUMN);
    const columnDefs = keptColumns.map(buildColumnDefinition).join(',\n  ');
    const keptColumnNames = keptColumns.map((column) => quoteIdentifier(column.name)).join(', ');

    db.exec('PRAGMA foreign_keys = OFF');

    const migrate = db.transaction(() => {
      db.exec(`CREATE TABLE caravans_migrated (\n  ${columnDefs}\n)`);
      db.exec(`INSERT INTO caravans_migrated (${keptColumnNames}) SELECT ${keptColumnNames} FROM caravans`);
      db.exec('DROP TABLE caravans');
      db.exec('ALTER TABLE caravans_migrated RENAME TO caravans');

      // Re-create indexes and other IF NOT EXISTS objects defined in canonical schema.
      executeSchemaStatements(db);
    });

    migrate();

    db.exec('PRAGMA foreign_keys = ON');
    const fkIssues = db.prepare('PRAGMA foreign_key_check').all();
    if (fkIssues.length > 0) {
      throw new Error(`[migration] Foreign key check failed: ${JSON.stringify(fkIssues)}`);
    }

    console.log(`[migration] Removed column ${REMOVED_COLUMN} successfully.`);
  } catch (error) {
    console.error('[migration] Failed to remove deprecated column:', error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
};

runMigration();

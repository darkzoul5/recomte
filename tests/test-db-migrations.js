import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

import { applySchema } from '../db/schema.js';
import { runMigrations } from '../db/migrations/index.js';

const makeTempDbPath = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recomte-db-'));
  return path.join(dir, 'app.db');
};

const columnExists = (db, tableName, columnName) => {
  const info = db.pragma(`table_info(${tableName})`);
  return Array.isArray(info) && info.some((column) => column?.name === columnName);
};

const main = async () => {
  const dbPath = makeTempDbPath();
  const db = new Database(dbPath);

  try {
    // Simulate an older DB schema: caravans table exists before later additive migrations.
    db.exec(`
      CREATE TABLE caravans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        slug TEXT,
        description TEXT,
        year INTEGER,
        price INTEGER,
        status TEXT,
        featured BOOLEAN DEFAULT 0,
        beds_count INTEGER,
        gross_weight_kg INTEGER,
        condition TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        camper_season TEXT,
        has_microwave BOOLEAN DEFAULT 0,
        has_oven BOOLEAN DEFAULT 0
      );
    `);

    db.prepare(
      `INSERT INTO caravans (camper_season, has_microwave, has_oven) VALUES (?, ?, ?)`
    ).run('winter', 1, 0);

    // Plan sequence: base schema + migrations.
    applySchema(db);
    const result = await runMigrations(db, { verbose: false, force: true });

    assert.equal(result.to, 4);
    assert.equal(result.skipped, false);

    assert.equal(columnExists(db, 'caravans', 'kitchen_appliances'), true);
    assert.equal(columnExists(db, 'caravans', 'brand'), true);
    assert.equal(columnExists(db, 'caravans', 'length_with_hitch_mm'), true);
    assert.equal(columnExists(db, 'caravans', 'length_without_hitch_mm'), true);
    assert.equal(columnExists(db, 'images', 'width'), true);
    assert.equal(columnExists(db, 'images', 'height'), true);

    const row = db.prepare('SELECT camper_season, kitchen_appliances, length_with_hitch_mm FROM caravans WHERE id = 1').get();
    assert.equal(row.camper_season, 'all_season');
    assert.equal(row.kitchen_appliances, '["microwave"]');
    assert.equal(row.length_with_hitch_mm, null);

    const userVersion = Number(db.pragma('user_version', { simple: true }) || 0);
    assert.equal(userVersion, 4);

    console.log('✓ DB migrations test passed');
  } finally {
    db.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

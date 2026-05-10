#!/usr/bin/env node
import { initDb, getDb, closeDb } from '../../db/db.js';

const columnExists = (db, table, column) => {
  const rows = db.prepare('PRAGMA table_info(' + table + ')').all();
  return rows.some((r) => String(r.name).toLowerCase() === column.toLowerCase());
};

const run = () => {
  initDb();
  const db = getDb();

  try {
    if (!columnExists(db, 'caravans', 'kitchen_appliances')) {
      db.exec('ALTER TABLE caravans ADD COLUMN kitchen_appliances TEXT');
      console.log('Added column caravans.kitchen_appliances');
    } else {
      console.log('Column caravans.kitchen_appliances already exists');
    }

    const selectStmt = db.prepare('SELECT id, has_microwave, has_oven, kitchen_appliances FROM caravans');
    const updateStmt = db.prepare('UPDATE caravans SET kitchen_appliances = ? WHERE id = ?');

    const rows = selectStmt.all();
    let updated = 0;

    for (const row of rows) {
      // Skip if already populated
      if (row.kitchen_appliances && String(row.kitchen_appliances).trim().length > 0) continue;

      const values = [];
      if (row.has_microwave === 1) values.push('microwave');
      if (row.has_oven === 1) values.push('oven');

      if (values.length > 0) {
        updateStmt.run(JSON.stringify(values), row.id);
        updated++;
      }
    }

    console.log(`Backfilled ${updated} rows with legacy appliance flags.`);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exitCode = 1;
  } finally {
    closeDb();
  }
};

run();

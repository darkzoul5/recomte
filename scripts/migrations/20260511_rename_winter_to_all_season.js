#!/usr/bin/env node
import { initDb, getDb, closeDb } from '../../db/db.js';

const run = () => {
  initDb();
  const db = getDb();

  try {
    const countBefore = db.prepare("SELECT COUNT(1) AS cnt FROM caravans WHERE camper_season = 'winter'").get().cnt;
    if (countBefore > 0) {
      const info = db.prepare("UPDATE caravans SET camper_season = 'all_season' WHERE camper_season = 'winter'").run();
      console.log(`Renamed ${info.changes} caravans from winter -> all_season`);
    } else {
      console.log('No caravans with camper_season = winter found');
    }

    // Optional: normalize any unexpected capitalizations
    const info2 = db.prepare("UPDATE caravans SET camper_season = 'all_season' WHERE LOWER(camper_season) = 'winter'").run();
    if (info2.changes > 0) {
      console.log(`Normalized casing on ${info2.changes} caravans (winter -> all_season)`);
    }
  } catch (e) {
    console.error('Migration failed:', e);
    process.exitCode = 1;
  } finally {
    closeDb();
  }
};

run();

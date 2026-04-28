#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { initDb, getDb, closeDb } from '../db/db.js';

const root = process.cwd();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const run = async () => {
  try {
    initDb();
    const db = getDb();

    const images = db.prepare('SELECT * FROM images').all();
    console.log(`Found ${images.length} image rows`);

    for (const img of images) {
      try {
        if (!img.url || typeof img.url !== 'string') continue;

        // Expect old pattern: /public/images/caravans/{id}/{filename}
        const m = img.url.match(/^\/public\/images\/caravans\/(\d+)\/(.+)$/);
        if (!m) {
          // Already in new format or non-standard — skip
          continue;
        }

        const caravanId = parseInt(m[1], 10);
        const origFilename = m[2];

        // Get slug for caravan
        const caravanRow = db.prepare('SELECT slug FROM caravans WHERE id = ?').get(caravanId);
        const slug = caravanRow && caravanRow.slug ? String(caravanRow.slug) : `caravan-${caravanId}`;

        const srcPath = path.join(root, img.url.replace(/^\//, ''));
        if (!fs.existsSync(srcPath)) {
          console.warn(`Source file missing for image id=${img.id}: ${srcPath}`);
          continue;
        }

        const destDir = path.join(root, 'public', 'images', 'caravans', slug);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        // Compute next counter based on existing files named {slug}-image-N
        const files = fs.readdirSync(destDir);
        const numRe = new RegExp('^' + escapeRegex(slug) + '-image-(\\d+)\\.');
        let max = 0;
        for (const f of files) {
          const mm = f.match(numRe);
          if (mm) {
            const n = parseInt(mm[1], 10);
            if (n > max) max = n;
          }
        }

        const ext = path.extname(origFilename).toLowerCase() || path.extname(srcPath).toLowerCase() || '.jpg';
        const newName = `${slug}-image-${max + 1}${ext}`;
        const destPath = path.join(destDir, newName);

        // Move file
        fs.renameSync(srcPath, destPath);

        const newUrl = `/public/images/caravans/${slug}/${newName}`;
        db.prepare('UPDATE images SET url = ? WHERE id = ?').run(newUrl, img.id);

        console.log(`Migrated image id=${img.id} -> ${newUrl}`);
      } catch (err) {
        console.error(`Failed to migrate image id=${img.id}:`, err.message);
      }
    }

    closeDb();
    console.log('Migration complete');
  } catch (e) {
    console.error('Migration failed:', e);
    try { closeDb(); } catch {}
    process.exit(1);
  }
};

run();

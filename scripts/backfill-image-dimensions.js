import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import '../src/server/bootstrap-env.js';
import { initDb, closeDb, images } from '../db/db.js';
import { resolveCaravanImagePath } from '../src/utils/storage-paths.js';

const main = async () => {
  await initDb();

  try {
    const allImages = images.getAll();
    let updated = 0;

    for (const image of allImages) {
      if (image.width && image.height) {
        continue;
      }

      const imagePath = resolveCaravanImagePath(image.url);
      if (!imagePath || !fs.existsSync(imagePath)) {
        continue;
      }

      const metadata = await sharp(imagePath).metadata();
      const width = Number.isInteger(metadata.width) ? metadata.width : null;
      const height = Number.isInteger(metadata.height) ? metadata.height : null;

      if (!width || !height) {
        continue;
      }

      images.update(image.id, { width, height });
      updated += 1;
    }

    console.log(`Updated image dimensions for ${updated} image(s)`);
  } finally {
    closeDb();
  }
};

main().catch((error) => {
  console.error('Failed to backfill image dimensions:', error);
  process.exit(1);
});

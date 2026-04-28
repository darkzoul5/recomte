import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { initDb, closeDb, images } from '../db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function migrateImagesToWebP() {
  try {
    console.log('Starting image WebP migration...\n');

    // Initialize database
    initDb();

    const allImages = images.getAll();
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    if (!allImages || allImages.length === 0) {
      console.log('No images found in database.');
      closeDb();
      return;
    }

    console.log(`Found ${allImages.length} images to process.\n`);

    for (const img of allImages) {
      try {
        const imageUrl = img.url;
        
        // Skip if already WebP
        if (imageUrl.toLowerCase().endsWith('.webp')) {
          console.log(`✓ SKIP (already WebP): ${imageUrl}`);
          skipCount++;
          continue;
        }

        // Resolve file path from URL
        const urlPath = imageUrl.replace(/^\/public\//, '');
        const filePath = path.join(rootDir, 'public', urlPath);

        if (!fs.existsSync(filePath)) {
          console.log(`✗ ERROR (file not found): ${imageUrl}`);
          errorCount++;
          continue;
        }

        // Determine new WebP path
        const dirPath = path.dirname(filePath);
        const baseName = path.basename(filePath, path.extname(filePath));
        const webpFilePath = path.join(dirPath, `${baseName}.webp`);
        const webpUrl = imageUrl.replace(/\.\w+$/, '.webp');

        // Convert to WebP
        await sharp(filePath)
          .webp({ quality: 80 })
          .toFile(webpFilePath);

        // Update database
        images.update(img.id, { url: webpUrl });

        // Optionally delete original file to save space
        // fs.unlinkSync(filePath);

        console.log(`✓ CONVERTED: ${imageUrl} → ${webpUrl}`);
        successCount++;
      } catch (error) {
        console.log(`✗ ERROR: ${img.url} - ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Migration complete!`);
    console.log(`  Converted: ${successCount}`);
    console.log(`  Skipped:   ${skipCount}`);
    console.log(`  Errors:    ${errorCount}`);
    console.log(`${'='.repeat(60)}`);
    console.log('\nNote: Original image files remain on disk.');
    console.log('To clean up original files and save space, uncomment:');
    console.log('  fs.unlinkSync(filePath);');
    console.log('in this script and run again.');

    closeDb();

  } catch (error) {
    console.error('Migration failed:', error);
    closeDb();
    process.exit(1);
  }
}

migrateImagesToWebP();

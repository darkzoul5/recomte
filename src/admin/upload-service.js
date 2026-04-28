import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { images, caravans } from '../../db/db.js';

export const parseMultipartForm = async (request) => {
  const formData = {};
  const uploadedFiles = [];

  const parts = request.parts();
  for await (const part of parts) {
    if (part.type === 'field') {
      if (formData[part.fieldname] !== undefined) {
        if (Array.isArray(formData[part.fieldname])) {
          formData[part.fieldname].push(part.value);
        } else {
          formData[part.fieldname] = [formData[part.fieldname], part.value];
        }
      } else {
        formData[part.fieldname] = part.value;
      }
    } else if (part.type === 'file') {
      if (part.fieldname === 'images') {
        const buffer = await part.toBuffer();
        if (buffer && buffer.length > 0) {
          uploadedFiles.push({
            filename: part.filename,
            buffer,
            mimetype: part.mimetype
          });
        }
      } else {
        await part.toBuffer();
      }
    }
  }

  return { formData, uploadedFiles };
};

export const handleImageUploads = async (caravanId, uploadedFiles, rootDir, logger) => {
  if (uploadedFiles.length === 0) {
    return;
  }

  // Resolve caravan slug (fallback to id if missing)
  let slug = `caravan-${caravanId}`;
  try {
    const caravan = caravans.getById(caravanId);
    if (caravan && caravan.slug) slug = String(caravan.slug);
  } catch (e) {
    // ignore and fallback to id-based slug
  }

  const imagesDir = path.join(rootDir, 'public', 'images', 'caravans', slug);
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Start numbering from existing images count + 1
  let existing = [];
  try {
    existing = images.getByCaravanId(caravanId) || [];
  } catch (_) {
    existing = [];
  }
  let counter = existing.length;

  for (const fileData of uploadedFiles) {
    try {
      if (!fileData.buffer || fileData.buffer.length === 0) {
        continue;
      }

      counter += 1;
      const webpFileName = `${slug}-image-${counter}.webp`;
      const webpFilePath = path.join(imagesDir, webpFileName);

      // Convert to WebP using sharp with quality optimization
      await sharp(fileData.buffer)
        .webp({ quality: 80 })
        .toFile(webpFilePath);

      const imageUrl = `/public/images/caravans/${slug}/${webpFileName}`;
      images.create(caravanId, imageUrl, fileData.filename, 0);
      
      logger.debug(`Converted and saved image: ${webpFileName}`);
    } catch (error) {
      logger.error(`Image upload/conversion failed for file ${fileData.filename}: ${error.message}`);
    }
  }
};

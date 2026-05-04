import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { images, caravans } from '../../../db/db.js';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const isAllowedImageMimeType = (mimetype) => {
  if (typeof mimetype !== 'string') return false;
  return ALLOWED_IMAGE_MIME_TYPES.has(mimetype.toLowerCase());
};

const resolveCaravanSlug = (caravanId) => {
  let slug = `caravan-${caravanId}`;
  try {
    const caravan = caravans.getById(caravanId);
    if (caravan && caravan.slug) slug = String(caravan.slug);
  } catch {
    // fall back to caravan id
  }

  return slug;
};

const ensureImagesDir = (rootDir, slug) => {
  const imagesDir = path.join(rootDir, 'public', 'images', 'caravans', slug);
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  return imagesDir;
};

export const saveCaravanImageAsWebp = async ({ caravanId, fileBuffer, originalFilename, mimetype, rootDir, logger }) => {
  if (!Number.isInteger(caravanId) || caravanId <= 0) {
    throw new Error('Invalid caravan ID');
  }

  if (!isAllowedImageMimeType(mimetype)) {
    throw new Error('Unsupported image type');
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Empty file buffer');
  }

  const slug = resolveCaravanSlug(caravanId);
  const imagesDir = ensureImagesDir(rootDir, slug);

  const existingImages = images.getByCaravanId(caravanId) || [];
  const nextIndex = existingImages.length + 1;
  const webpFileName = `${slug}-image-${nextIndex}.webp`;
  const webpFilePath = path.join(imagesDir, webpFileName);

  await sharp(fileBuffer)
    .webp({ quality: 80 })
    .toFile(webpFilePath);

  const imageUrl = `/public/images/caravans/${slug}/${webpFileName}`;
  const createdImage = images.create(caravanId, imageUrl, originalFilename || '', 0);

  if (logger && typeof logger.debug === 'function') {
    logger.debug(`Converted and saved image: ${webpFileName}`);
  }

  return createdImage;
};

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
        if (!isAllowedImageMimeType(part.mimetype)) {
          part.file.resume();
          continue;
        }

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

  for (const file of uploadedFiles) {
    await saveCaravanImageAsWebp({
      caravanId,
      fileBuffer: file.buffer,
      originalFilename: file.filename,
      mimetype: file.mimetype,
      rootDir,
      logger
    });
  }
};

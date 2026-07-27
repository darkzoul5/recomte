import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { images, caravans } from '../../../db/db.ts';
import { getCaravanImagesDir, getPublicCaravanImagesUrlPrefix } from '../../utils/storage-paths.ts';

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

const ensureImagesDir = (slug) => {
  const imagesDir = path.join(getCaravanImagesDir(), slug);
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  return imagesDir;
};

export const saveCaravanImageAsWebp = async ({ caravanId, fileBuffer, originalFilename, mimetype, log }) => {
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
  const imagesDir = ensureImagesDir(slug);

  const existingImages = images.getByCaravanId(caravanId) || [];
  const nextIndex = existingImages.length + 1;
  const webpFileName = `${slug}-image-${nextIndex}.webp`;
  const webpFilePath = path.join(imagesDir, webpFileName);

  await sharp(fileBuffer)
    .rotate()
    .webp({ quality: 80 })
    .toFile(webpFilePath);

  const metadata = await sharp(webpFilePath).metadata();
  const imageWidth = Number.isInteger(metadata.width) ? metadata.width : null;
  const imageHeight = Number.isInteger(metadata.height) ? metadata.height : null;

  const imageUrl = `${getPublicCaravanImagesUrlPrefix()}/${slug}/${webpFileName}`;
  const createdImage = images.create(caravanId, imageUrl, originalFilename || '', 0, imageWidth, imageHeight);

  if (log && typeof log.debug === 'function') {
    log.debug({ caravanId, fileName: webpFileName }, 'Converted and saved image');
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

export const handleImageUploads = async (caravanId, uploadedFiles, log) => {
  if (uploadedFiles.length === 0) {
    return;
  }

  for (const file of uploadedFiles) {
    await saveCaravanImageAsWebp({
      caravanId,
      fileBuffer: file.buffer,
      originalFilename: file.filename,
      mimetype: file.mimetype,
      log
    });
  }
};

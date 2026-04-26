import path from 'path';
import fs from 'fs';
import { images } from '../../db/db.js';

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

export const handleImageUploads = (caravanId, uploadedFiles, rootDir, logger) => {
  if (uploadedFiles.length === 0) {
    return;
  }

  const imagesDir = path.join(rootDir, 'public', 'images', 'caravans', String(caravanId));
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  for (const fileData of uploadedFiles) {
    try {
      if (!fileData.buffer || fileData.buffer.length === 0) {
        continue;
      }

      const ext = path.extname(fileData.filename);
      const baseName = path.basename(fileData.filename, ext);
      const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
      const fileName = `caravan-${caravanId}-${sanitized}-${Date.now()}${ext}`;
      const filePath = path.join(imagesDir, fileName);

      fs.writeFileSync(filePath, fileData.buffer);

      const imageUrl = `/public/images/caravans/${caravanId}/${fileName}`;
      images.create(caravanId, imageUrl, fileData.filename, 0);
    } catch (error) {
      logger.error(`Image upload failed for file ${fileData.filename}: ${error.message}`);
    }
  }
};

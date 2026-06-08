import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage');

const normalizePath = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return path.resolve(value.trim());
};

export const getStorageRoot = () => normalizePath(process.env.STORAGE_ROOT) || DEFAULT_STORAGE_ROOT;

export const getDbPath = () => normalizePath(process.env.DB_PATH) || path.join(getStorageRoot(), 'db', 'app.db');

export const getBackupsDir = () => path.join(getStorageRoot(), 'backups');

export const getImagesRootDir = () => path.join(getStorageRoot(), 'images');

export const getCaravanImagesDir = () => path.join(getImagesRootDir(), 'caravans');

export const getPublicCaravanImagesUrlPrefix = () => '/public/images/caravans';

export const resolveCaravanImagePath = (imageUrl) => {
  const prefix = `${getPublicCaravanImagesUrlPrefix()}/`;

  if (typeof imageUrl !== 'string' || !imageUrl.startsWith(prefix)) {
    return null;
  }

  const relativePath = imageUrl.slice(prefix.length).replaceAll('/', path.sep);
  return path.join(getCaravanImagesDir(), relativePath);
};

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applySchema } from './schema.ts';
import { runMigrations } from './migrations/index.ts';
import { getDbPath, resolveCaravanImagePath } from '../src/utils/storage-paths.ts';
import {
  validateCaravanData,
  deriveCaravanFields,
  filterCaravanData,
  validateImageData
} from '../src/utils/validation.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = getDbPath();

let db: any = null;

type CaravanFilters = {
  status?: string;
  featured?: boolean;
  winter_rated?: boolean;
  camper_season?: string;
};





export const initDb = async () => {
  try {
    // Ensure directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize better-sqlite3
    db = new Database(DB_PATH);
    
    // Enable foreign keys and set journal mode for better concurrency
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');

    applySchema(db);
    await runMigrations(db, { verbose: true });


    console.log(`✓ Database initialized at ${DB_PATH}`);
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
};

export const closeDb = () => {
  if (db) {
    db.close();
    db = null;
  }
};

// Helper function to run SELECT queries
const query = (sql: string, params: any[] = []) => {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (error) {
    console.error('Query error:', error, 'SQL:', sql, 'Params:', params);
    return [];
  }
};

// Helper function to run INSERT/UPDATE/DELETE
const run = (sql: string, params: any[] = []) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    console.error('Run error:', error, 'SQL:', sql, 'Params:', params);
    throw error;
  }
};

// Dynamic SQL Builder - converts values to appropriate types
const convertValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
};

// Accept object/array/string feature payloads and normalize them into key/value pairs.
const normalizeFeaturesInput = (featuresInput) => {
  if (featuresInput === undefined || featuresInput === null || featuresInput === '') {
    return [];
  }

  let parsed = featuresInput;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  const normalized = [];

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (entry && typeof entry === 'object' && entry.key) {
        normalized.push({ key: String(entry.key), value: entry.value ?? '1' });
      } else if (typeof entry === 'string' && entry.trim()) {
        normalized.push({ key: entry.trim(), value: '1' });
      }
    }
  } else if (parsed && typeof parsed === 'object') {
    for (const [key, value] of Object.entries(parsed)) {
      if (!key || value === undefined || value === null || value === '') continue;
      normalized.push({ key: String(key), value });
    }
  }

  return normalized;
};

// Dynamic INSERT builder
const buildInsert = (table: string, data: Record<string, any>) => {
  const keys = Object.keys(data);
  if (keys.length === 0) throw new Error('No data provided for INSERT');
  
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const values = keys.map(key => convertValue(data[key]));
  
  return { sql, values };
};

// Dynamic UPDATE builder
const buildUpdate = (table: string, data: Record<string, any>, whereClause: string, whereValues: any[] = []) => {
  const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
  if (keys.length === 0) throw new Error('No data provided for UPDATE');
  
  const updates = keys.map(key => `${key} = ?`).join(', ');
  const values = keys.map(key => convertValue(data[key]));
  const sql = `UPDATE ${table} SET ${updates} WHERE ${whereClause}`;
  
  return { sql, values: [...values, ...whereValues] };
};


// Caravans queries
export const caravans = {
  getAll: (filters: CaravanFilters = {}) => {
    let sql = 'SELECT * FROM caravans WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.featured !== undefined) {
      sql += ' AND featured = ?';
      params.push(filters.featured ? 1 : 0);
    }
    if (filters.winter_rated !== undefined) {
      sql += ' AND camper_season = ?';
      params.push(filters.winter_rated ? 'all_season' : 'summer');
    }
    if (filters.camper_season) {
      sql += ' AND camper_season = ?';
      params.push(filters.camper_season);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    return query(sql, params);
  },

  getById: (id) => {
    const results = query('SELECT * FROM caravans WHERE id = ?', [id]);
    return results[0] || null;
  },

  getBySlug: (slug) => {
    const results = query('SELECT * FROM caravans WHERE slug = ?', [slug]);
    return results[0] || null;
  },

  getFeatured: (limit = 6) => {
    return query(
      'SELECT * FROM caravans WHERE featured = 1 ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  },

  create: (data) => {
    const normalizedData = deriveCaravanFields(data);

    // Validate data before creating
    const validation = validateCaravanData(normalizedData, false);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    // Extract features separately (stored in caravan_features table)
    const { features, ...caravanData } = normalizedData;

    // Filter to only include whitelisted columns
    const filteredData = filterCaravanData(caravanData, false);

    // Build and execute INSERT
    const { sql, values } = buildInsert('caravans', filteredData);
    const result = run(sql, values);
    
    // Handle features in caravan_features table
    const featurePairs = normalizeFeaturesInput(features);
    if (featurePairs.length > 0) {
      featurePairs.forEach(feature => {
        run(
          'INSERT INTO caravan_features (caravan_id, feature_key, feature_value) VALUES (?, ?, ?)',
          [result.lastInsertRowid, feature.key, String(feature.value)]
        );
      });
    }
    
    return { id: result.lastInsertRowid, ...data };
  },

  update: (id, data) => {
    // Validate ID is an integer
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid caravan ID');
    }

    const normalizedData = deriveCaravanFields(data);

    // Extract features before validation
    const { features, ...dataWithoutFeatures } = normalizedData;

    // Validate and filter data - only allow whitelisted columns
    const validation = validateCaravanData(dataWithoutFeatures, true);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    // Filter to only allow whitelisted columns
    const filteredData = filterCaravanData(dataWithoutFeatures, true);

    // Remove system fields that shouldn't be updated
    const mutableFilteredData = filteredData as Record<string, any>;
    delete mutableFilteredData.id;
    delete mutableFilteredData.created_at;
    delete mutableFilteredData.updated_at;

    // Build UPDATE statement if there are fields to update
    if (Object.keys(filteredData).length > 0) {
      const { sql, values } = buildUpdate('caravans', filteredData, 'id = ?', [id]);
      // Add timestamp
      const sqlWithTimestamp = sql.replace('WHERE id = ?', ', updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      run(sqlWithTimestamp, values);
    }

    // Handle features in caravan_features table if provided
    if (features !== undefined) {
      // Clear existing features
      run('DELETE FROM caravan_features WHERE caravan_id = ?', [id]);
      
      // Insert new features
      const featurePairs = normalizeFeaturesInput(features);
      if (featurePairs.length > 0) {
        featurePairs.forEach(feature => {
          run(
            'INSERT INTO caravan_features (caravan_id, feature_key, feature_value) VALUES (?, ?, ?)',
            [id, feature.key, String(feature.value)]
          );
        });
      }
    }

    return caravans.getById(id);
  },

  delete: (id) => {
    run('DELETE FROM caravans WHERE id = ?', [id]);
  }
};


// Images queries
export const images = {
  getByCaravanId: (caravanId) => {
    // Validate caravan ID
    if (!Number.isInteger(caravanId) || caravanId <= 0) {
      return [];
    }
    return query(
      'SELECT * FROM images WHERE caravan_id = ? ORDER BY sort_order ASC',
      [caravanId]
    );
  },

  getById: (imageId) => {
    // Validate image ID
    if (!Number.isInteger(imageId) || imageId <= 0) {
      return null;
    }
    const results = query('SELECT * FROM images WHERE id = ?', [imageId]);
    return results[0] || null;
  },

  getAll: () => {
    return query('SELECT * FROM images ORDER BY caravan_id ASC, sort_order ASC');
  },

  create: (caravanId, url, altText = '', sortOrder = 0, width = null, height = null) => {
    // Validate inputs
    if (!Number.isInteger(caravanId) || caravanId <= 0) {
      throw new Error('Invalid caravan ID');
    }

    const imageData = {
      caravan_id: caravanId,
      url,
      alt_text: altText,
      sort_order: sortOrder,
      width,
      height
    };

    const validation = validateImageData(imageData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const { sql, values } = buildInsert('images', imageData);
    const result = run(sql, values);
    
    return { id: result.lastInsertRowid, ...imageData };
  },

  delete: (imageId, deleteFile = true) => {
    // Validate image ID
    if (!Number.isInteger(imageId) || imageId <= 0) {
      throw new Error('Invalid image ID');
    }
    
    // Get image details to delete the file
    if (deleteFile) {
      const image = images.getById(imageId);
      if (image && image.url) {
        try {
          // Convert URL path to filesystem path
          // URL format: /public/images/caravans/5/caravan-5-filename.jpg
          const filePath = resolveCaravanImagePath(image.url);
          
          // Delete file if it exists
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`File deleted: ${filePath}`);
          }
        } catch (error) {
          console.error(`Failed to delete image file for imageId ${imageId}:`, error);
          // Continue with DB deletion even if file deletion fails
        }
      }
    }
    
    run('DELETE FROM images WHERE id = ?', [imageId]);
  },

  reorder: (imageId, sortOrder) => {
    // Validate inputs
    if (!Number.isInteger(imageId) || imageId <= 0) {
      throw new Error('Invalid image ID');
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      throw new Error('Invalid sort order');
    }
    run('UPDATE images SET sort_order = ? WHERE id = ?', [sortOrder, imageId]);
  },

  update: (imageId, updates) => {
    // Validate image ID
    if (!Number.isInteger(imageId) || imageId <= 0) {
      throw new Error('Invalid image ID');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates must be an object');
    }

    // Only allow updating specific fields
    const allowedFields = ['url', 'alt_text', 'sort_order', 'width', 'height'];
    const updateFields = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields[key] = value;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return;
    }

    const { sql, values } = buildUpdate('images', updateFields, 'id = ?', [imageId]);
    run(sql, values);
  }
};

// Caravan Features queries
export const features = {
  getByCaravanId: (caravanId) => {
    // Validate caravan ID
    if (!Number.isInteger(caravanId) || caravanId <= 0) {
      return [];
    }
    return query(
      'SELECT feature_key, feature_value FROM caravan_features WHERE caravan_id = ? ORDER BY feature_key ASC',
      [caravanId]
    );
  },

  getByKey: (caravanId, featureKey) => {
    // Validate inputs
    if (!Number.isInteger(caravanId) || caravanId <= 0 || typeof featureKey !== 'string') {
      return null;
    }
    const results = query(
      'SELECT feature_value FROM caravan_features WHERE caravan_id = ? AND feature_key = ?',
      [caravanId, featureKey]
    );
    return results[0]?.feature_value || null;
  },

  getByKeyValue: (featureKey, featureValue = null) => {
    if (typeof featureKey !== 'string' || !featureKey.trim()) {
      return [];
    }

    if (featureValue === null || featureValue === undefined || featureValue === '') {
      return query(
        'SELECT caravan_id, feature_key, feature_value FROM caravan_features WHERE feature_key = ?',
        [featureKey]
      );
    }

    return query(
      'SELECT caravan_id, feature_key, feature_value FROM caravan_features WHERE feature_key = ? AND feature_value = ?',
      [featureKey, String(featureValue)]
    );
  },

  set: (caravanId, featureKey, featureValue) => {
    // Validate inputs
    if (!Number.isInteger(caravanId) || caravanId <= 0 || typeof featureKey !== 'string') {
      throw new Error('Invalid caravan ID or feature key');
    }

    run(
      'INSERT INTO caravan_features (caravan_id, feature_key, feature_value) VALUES (?, ?, ?) ON CONFLICT(caravan_id, feature_key) DO UPDATE SET feature_value = ?',
      [caravanId, featureKey, String(featureValue), String(featureValue)]
    );
  },

  delete: (caravanId, featureKey) => {
    // Validate inputs
    if (!Number.isInteger(caravanId) || caravanId <= 0) {
      throw new Error('Invalid caravan ID');
    }

    if (featureKey) {
      // Delete specific feature
      run('DELETE FROM caravan_features WHERE caravan_id = ? AND feature_key = ?', [caravanId, featureKey]);
    } else {
      // Delete all features for caravan
      run('DELETE FROM caravan_features WHERE caravan_id = ?', [caravanId]);
    }
  }
};

// Admin Users queries
export const adminUsers = {
  count: () => {
    const result = query('SELECT COUNT(*) AS total FROM admin_users');
    return Number(result[0]?.total || 0);
  },

  exists: () => {
    return adminUsers.count() > 0;
  },

  getByUsername: (username) => {
    if (typeof username !== 'string' || !username.trim()) {
      return null;
    }

    const result = query(
      'SELECT id, username, password_hash, created_at, updated_at FROM admin_users WHERE username = ? LIMIT 1',
      [username.trim()]
    );

    return result[0] || null;
  },

  getById: (id) => {
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    const result = query(
      'SELECT id, username, password_hash, created_at, updated_at FROM admin_users WHERE id = ? LIMIT 1',
      [id]
    );

    return result[0] || null;
  },

  create: (username, passwordHash) => {
    if (typeof username !== 'string' || !username.trim()) {
      throw new Error('Username is required');
    }

    if (typeof passwordHash !== 'string' || !passwordHash.trim()) {
      throw new Error('Password hash is required');
    }

    const cleanUsername = username.trim();
    const cleanHash = passwordHash.trim();
    const result = run(
      'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
      [cleanUsername, cleanHash]
    );

    return {
      id: result.lastInsertRowid,
      username: cleanUsername,
      password_hash: cleanHash
    };
  },

  updatePasswordHash: (username, passwordHash) => {
    if (typeof username !== 'string' || !username.trim()) {
      throw new Error('Username is required');
    }

    if (typeof passwordHash !== 'string' || !passwordHash.trim()) {
      throw new Error('Password hash is required');
    }

    const result = run(
      'UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
      [passwordHash.trim(), username.trim()]
    );

    return result.changes > 0;
  }
};

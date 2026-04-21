import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSchema } from './schema.js';
import {
  validateColumnName,
  validateCaravanData,
  filterCaravanData,
  validateImageData,
  filterImageData
} from '../src/utils/validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/app.db');

let db = null;

export const initDb = () => {
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

    // Create schema
    const schema = createSchema();
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    statements.forEach(statement => {
      try {
        db.exec(statement);
      } catch (e) {
        // Silently ignore if table/index already exists
        if (!e.message.includes('already exists')) {
          console.error('Schema error:', e);
        }
      }
    });


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
const query = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (error) {
    console.error('Query error:', error, 'SQL:', sql, 'Params:', params);
    return [];
  }
};

// Helper function to run INSERT/UPDATE/DELETE
const run = (sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    console.error('Run error:', error, 'SQL:', sql, 'Params:', params);
    throw error;
  }
};


// Caravans queries
export const caravans = {
  getAll: (filters = {}) => {
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
      sql += ' AND winter_rated = ?';
      params.push(filters.winter_rated ? 1 : 0);
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
      'SELECT * FROM caravans WHERE featured = 1 AND status = "available" ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  },

  create: (data) => {
    // Validate data before creating
    const validation = validateCaravanData(data, false);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const {
      title,
      slug,
      description,
      year,
      price,
      status,
      featured,
      beds_count,
      has_shower,
      has_toilet,
      toilet_type,
      fresh_water_tank_l,
      grey_water_tank_l,
      has_hot_water,
      water_heater_type,
      boiler_volume_l,
      fridge_type,
      fridge_volume_l,
      sink_present,
      has_cooktop,
      cooktop_type,
      stove_burners_count,
      has_oven,
      kitchen_outlets_count,
      has_heating,
      heating_type,
      heater_brand,
      heating_source,
      heating_distribution,
      has_insulation,
      double_glazed_windows,
      winter_rated,
      battery_type,
      battery_capacity_ah,
      has_solar_panels,
      solar_wattage,
      inverter_wattage,
      has_shore_power,
      has_12v_system,
      length_mm,
      width_mm,
      height_mm,
      interior_height_mm,
      weight_empty_kg,
      max_weight_kg,
      axle_type,
      features
    } = data;

    const sql = `
      INSERT INTO caravans (
        title, slug, description, year, price, status, featured,
        beds_count, has_shower, has_toilet, toilet_type,
        fresh_water_tank_l, grey_water_tank_l, has_hot_water, water_heater_type, boiler_volume_l,
        fridge_type, fridge_volume_l, sink_present, has_cooktop, cooktop_type, stove_burners_count, has_oven, kitchen_outlets_count,
        has_heating, heating_type, heater_brand, heating_source, heating_distribution,
        has_insulation, double_glazed_windows, winter_rated,
        battery_type, battery_capacity_ah, has_solar_panels, solar_wattage, inverter_wattage, has_shore_power, has_12v_system,
        length_mm, width_mm, height_mm, interior_height_mm, weight_empty_kg, max_weight_kg, axle_type,
        features
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?
      )
    `;

    const params = [
      title, slug, description, year, price, status, featured ? 1 : 0,
      beds_count, has_shower ? 1 : 0, has_toilet ? 1 : 0, toilet_type,
      fresh_water_tank_l, grey_water_tank_l, has_hot_water ? 1 : 0, water_heater_type, boiler_volume_l,
      fridge_type, fridge_volume_l, sink_present ? 1 : 0, has_cooktop ? 1 : 0, cooktop_type, stove_burners_count, has_oven ? 1 : 0, kitchen_outlets_count,
      has_heating ? 1 : 0, heating_type, heater_brand, heating_source, heating_distribution,
      has_insulation ? 1 : 0, double_glazed_windows ? 1 : 0, winter_rated ? 1 : 0,
      battery_type, battery_capacity_ah, has_solar_panels ? 1 : 0, solar_wattage, inverter_wattage, has_shore_power ? 1 : 0, has_12v_system ? 1 : 0,
      length_mm, width_mm, height_mm, interior_height_mm, weight_empty_kg, max_weight_kg, axle_type,
      typeof features === 'string' ? features : JSON.stringify(features || [])
    ];

    const result = run(sql, params);
    
    return { id: result.lastInsertRowid, ...data };
  },

  update: (id, data) => {
    // Validate ID is an integer
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid caravan ID');
    }

    // Validate and filter data - only allow whitelisted columns
    const validation = validateCaravanData(data, true);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    // Filter to only allow whitelisted columns
    const filteredData = filterCaravanData(data, true);

    if (Object.keys(filteredData).length === 0) {
      return caravans.getById(id); // No updates
    }

    const updates = [];
    const values = [];

    // Process each field with proper validation based on type
    Object.entries(filteredData).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        updates.push(`${key} = ?`);
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else if (typeof value === 'object' && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });

    if (updates.length === 0) return caravans.getById(id);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE caravans SET ${updates.join(', ')} WHERE id = ?`;
    run(sql, values);

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

  create: (caravanId, url, altText = '', sortOrder = 0) => {
    // Validate inputs
    if (!Number.isInteger(caravanId) || caravanId <= 0) {
      throw new Error('Invalid caravan ID');
    }

    const imageData = {
      url,
      alt_text: altText,
      sort_order: sortOrder
    };

    const validation = validateImageData(imageData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const result = run(
      'INSERT INTO images (caravan_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)',
      [caravanId, url, altText, sortOrder]
    );
    
    const id = result.lastInsertRowid;
    
    return { id, caravan_id: caravanId, url, alt_text: altText, sort_order: sortOrder };
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
          const urlPath = image.url.replace(/^\//, ''); // Remove leading slash
          const filePath = path.join(__dirname, '..', urlPath);
          
          // Delete file if it exists
          if (fs.existsSync(filePath)) {
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
  }
};

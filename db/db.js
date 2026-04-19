import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSchema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/app.db');

let db = null;

export const initDb = () => {
  try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Create schema
    const schema = createSchema();
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    statements.forEach(statement => {
      db.exec(statement);
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

// Caravans queries
export const caravans = {
  getAll: (filters = {}) => {
    let query = 'SELECT * FROM caravans WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.featured !== undefined) {
      query += ' AND featured = ?';
      params.push(filters.featured ? 1 : 0);
    }
    if (filters.winter_rated !== undefined) {
      query += ' AND winter_rated = ?';
      params.push(filters.winter_rated ? 1 : 0);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  getById: (id) => {
    const stmt = db.prepare('SELECT * FROM caravans WHERE id = ?');
    return stmt.get(id);
  },

  getBySlug: (slug) => {
    const stmt = db.prepare('SELECT * FROM caravans WHERE slug = ?');
    return stmt.get(slug);
  },

  getFeatured: (limit = 6) => {
    const stmt = db.prepare(
      'SELECT * FROM caravans WHERE featured = 1 AND status = "available" ORDER BY created_at DESC LIMIT ?'
    );
    return stmt.all(limit);
  },

  create: (data) => {
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

    const stmt = db.prepare(`
      INSERT INTO caravans (
        title, slug, description, year, price, status, featured,
        beds_count, has_shower, has_toilet, toilet_type,
        fresh_water_tank_l, grey_water_tank_l, has_hot_water, water_heater_type, boiler_volume_l,
        fridge_type, fridge_volume_l, sink_present, has_cooktop, cooktop_type, stove_burners_count, has_oven,
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
    `);

    const result = stmt.run(
      title, slug, description, year, price, status, featured ? 1 : 0,
      beds_count, has_shower ? 1 : 0, has_toilet ? 1 : 0, toilet_type,
      fresh_water_tank_l, grey_water_tank_l, has_hot_water ? 1 : 0, water_heater_type, boiler_volume_l,
      fridge_type, fridge_volume_l, sink_present ? 1 : 0, has_cooktop ? 1 : 0, cooktop_type, stove_burners_count, has_oven ? 1 : 0,
      has_heating ? 1 : 0, heating_type, heater_brand, heating_source, heating_distribution,
      has_insulation ? 1 : 0, double_glazed_windows ? 1 : 0, winter_rated ? 1 : 0,
      battery_type, battery_capacity_ah, has_solar_panels ? 1 : 0, solar_wattage, inverter_wattage, has_shore_power ? 1 : 0, has_12v_system ? 1 : 0,
      length_mm, width_mm, height_mm, interior_height_mm, weight_empty_kg, max_weight_kg, axle_type,
      typeof features === 'string' ? features : JSON.stringify(features || [])
    );

    return { id: result.lastInsertRowid, ...data };
  },

  update: (id, data) => {
    const updates = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
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

    if (updates.length === 0) return null;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`UPDATE caravans SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return caravans.getById(id);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM caravans WHERE id = ?');
    stmt.run(id);
  }
};

// Images queries
export const images = {
  getByCaravanId: (caravanId) => {
    const stmt = db.prepare('SELECT * FROM images WHERE caravan_id = ? ORDER BY sort_order ASC');
    return stmt.all(caravanId);
  },

  create: (caravanId, url, altText = '', sortOrder = 0) => {
    const stmt = db.prepare(
      'INSERT INTO images (caravan_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(caravanId, url, altText, sortOrder);
    return { id: result.lastInsertRowid, caravan_id: caravanId, url, alt_text: altText, sort_order: sortOrder };
  },

  delete: (imageId) => {
    const stmt = db.prepare('DELETE FROM images WHERE id = ?');
    stmt.run(imageId);
  },

  reorder: (imageId, sortOrder) => {
    const stmt = db.prepare('UPDATE images SET sort_order = ? WHERE id = ?');
    stmt.run(sortOrder, imageId);
  }
};

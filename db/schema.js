export const createSchema = () => {
  const schema = `
-- caravans table (comprehensive specs)
CREATE TABLE IF NOT EXISTS caravans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  brand TEXT,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  year INTEGER,
  price INTEGER,
  status TEXT DEFAULT 'available',
  featured BOOLEAN DEFAULT 0,
  
  -- SLEEPING & BASIC
  beds_count INTEGER,
  shower_type TEXT,
  has_toilet BOOLEAN DEFAULT 0,
  toilet_type TEXT,
  windows_count INTEGER,
  door_position TEXT,
  manufacturer_country TEXT,
  
  -- WATER SYSTEMS
  fresh_water_tank_l INTEGER,
  grey_water_tank_l INTEGER,
  has_hot_water BOOLEAN DEFAULT 0,
  water_heater_type TEXT,
  boiler_volume_l INTEGER,
  
  -- KITCHEN
  kitchen_appliances TEXT,
  fridge_type TEXT,
  fridge_volume_l INTEGER,
  sink_present BOOLEAN DEFAULT 0,
  cooktop_type TEXT,
  stove_burners_count INTEGER,
  has_microwave BOOLEAN DEFAULT 0,
  has_oven BOOLEAN DEFAULT 0,
  
  -- HEATING & CLIMATE
  has_heating BOOLEAN DEFAULT 0,
  heating_type TEXT,
  heating_distribution TEXT,
  heater_brand TEXT,
  has_ac BOOLEAN DEFAULT 0,
  vent_fans_count INTEGER,
  skylights_count INTEGER,
  camper_season TEXT,
  
  -- COMFORT
  double_glazed_windows BOOLEAN DEFAULT 0,
  
  -- ELECTRICAL SYSTEM
  battery_type TEXT,
  battery_capacity_ah INTEGER,
  solar_wattage INTEGER,
  inverter_wattage INTEGER,
  has_12v_system BOOLEAN DEFAULT 0,
  
  -- DIMENSIONS & WEIGHT
  length_mm INTEGER,
  length_with_hitch_mm INTEGER,
  length_without_hitch_mm INTEGER,
  width_mm INTEGER,
  height_mm INTEGER,
  interior_height_mm INTEGER,
  curb_weight_kg INTEGER,
  gross_weight_kg INTEGER,
  
  -- CHASSIS & TOWING
  axles_count INTEGER,
  brake_type TEXT,
  suspension_type TEXT,
  wheel_size_inch INTEGER,
  hitch_weight_kg INTEGER,
  braked BOOLEAN DEFAULT 0,
  stabilizer_present BOOLEAN DEFAULT 0,
  
  -- CONDITION & HISTORY
  condition TEXT,
  last_service_date DATE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- images table (up to 30 per caravan)
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caravan_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER,
  width INTEGER,
  height INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(caravan_id) REFERENCES caravans(id) ON DELETE CASCADE
);

-- caravan_features table (queryable features for better filtering)
CREATE TABLE IF NOT EXISTS caravan_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caravan_id INTEGER NOT NULL,
  feature_key TEXT NOT NULL,
  feature_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(caravan_id) REFERENCES caravans(id) ON DELETE CASCADE,
  UNIQUE(caravan_id, feature_key)
);

-- admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- sessions table (persistent session storage)
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- auth throttle state (login rate limits and lockouts)
CREATE TABLE IF NOT EXISTS auth_throttle_state (
  state_key TEXT PRIMARY KEY,
  state_type TEXT NOT NULL CHECK (state_type IN ('rate_limit', 'login_attempt')),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  window_start INTEGER,
  first_attempt_at INTEGER,
  lock_until INTEGER,
  expires_at INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes (Phase 6)
CREATE INDEX IF NOT EXISTS idx_caravans_slug ON caravans(slug);
CREATE INDEX IF NOT EXISTS idx_caravans_status ON caravans(status);
CREATE INDEX IF NOT EXISTS idx_caravans_featured ON caravans(featured);
CREATE INDEX IF NOT EXISTS idx_caravans_year ON caravans(year);
CREATE INDEX IF NOT EXISTS idx_caravans_price ON caravans(price);
CREATE INDEX IF NOT EXISTS idx_caravans_gross_weight_kg ON caravans(gross_weight_kg);
CREATE INDEX IF NOT EXISTS idx_caravans_beds_count ON caravans(beds_count);
CREATE INDEX IF NOT EXISTS idx_caravans_camper_season ON caravans(camper_season);
CREATE INDEX IF NOT EXISTS idx_caravans_condition ON caravans(condition);
CREATE INDEX IF NOT EXISTS idx_caravans_created_at ON caravans(created_at);
CREATE INDEX IF NOT EXISTS idx_images_caravan_id ON images(caravan_id);
CREATE INDEX IF NOT EXISTS idx_images_sort_order ON images(caravan_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_features_caravan_id ON caravan_features(caravan_id);
CREATE INDEX IF NOT EXISTS idx_features_key_value ON caravan_features(feature_key, feature_value);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_throttle_state_type ON auth_throttle_state(state_type);
CREATE INDEX IF NOT EXISTS idx_auth_throttle_state_window_start ON auth_throttle_state(state_type, window_start);
CREATE INDEX IF NOT EXISTS idx_auth_throttle_state_lock_until ON auth_throttle_state(state_type, lock_until);
CREATE INDEX IF NOT EXISTS idx_auth_throttle_state_expires_at ON auth_throttle_state(expires_at);
  `;

  return schema;
};

export const REQUIRED_TABLES = [
  'caravans',
  'images',
  'caravan_features',
  'admin_users',
  'sessions',
  'auth_throttle_state'
];

export const applySchema = (db) => {
  const statements = createSchema()
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
};

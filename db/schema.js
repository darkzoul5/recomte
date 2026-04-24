export const createSchema = () => {
  const schema = `
-- caravans table (comprehensive specs)
CREATE TABLE IF NOT EXISTS caravans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
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
  tow_vehicle_max_kg INTEGER,
  
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
  `;

  return schema;
};

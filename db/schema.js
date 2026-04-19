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
  has_shower BOOLEAN DEFAULT 0,
  has_toilet BOOLEAN DEFAULT 0,
  toilet_type TEXT,
  
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
  has_cooktop BOOLEAN DEFAULT 0,
  cooktop_type TEXT,
  stove_burners_count INTEGER,
  has_oven BOOLEAN DEFAULT 0,
  
  -- HEATING
  has_heating BOOLEAN DEFAULT 0,
  heating_type TEXT,
  heater_brand TEXT,
  heating_source TEXT,
  heating_distribution TEXT,
  
  -- INSULATION & COMFORT
  has_insulation BOOLEAN DEFAULT 0,
  double_glazed_windows BOOLEAN DEFAULT 0,
  winter_rated BOOLEAN DEFAULT 0,
  
  -- ELECTRICAL SYSTEM
  battery_type TEXT,
  battery_capacity_ah INTEGER,
  has_solar_panels BOOLEAN DEFAULT 0,
  solar_wattage INTEGER,
  inverter_wattage INTEGER,
  has_shore_power BOOLEAN DEFAULT 0,
  has_12v_system BOOLEAN DEFAULT 0,
  
  -- DIMENSIONS & WEIGHT
  length_mm INTEGER,
  width_mm INTEGER,
  height_mm INTEGER,
  interior_height_mm INTEGER,
  weight_empty_kg INTEGER,
  max_weight_kg INTEGER,
  axle_type TEXT,
  
  -- FEATURES (JSON array for flexibility)
  features TEXT,
  
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

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_caravans_slug ON caravans(slug);
CREATE INDEX IF NOT EXISTS idx_caravans_status ON caravans(status);
CREATE INDEX IF NOT EXISTS idx_caravans_featured ON caravans(featured);
CREATE INDEX IF NOT EXISTS idx_caravans_year ON caravans(year);
CREATE INDEX IF NOT EXISTS idx_caravans_price ON caravans(price);
CREATE INDEX IF NOT EXISTS idx_caravans_winter_rated ON caravans(winter_rated);
CREATE INDEX IF NOT EXISTS idx_caravans_created_at ON caravans(created_at);
CREATE INDEX IF NOT EXISTS idx_images_caravan_id ON images(caravan_id);
CREATE INDEX IF NOT EXISTS idx_images_sort_order ON images(caravan_id, sort_order);
  `;

  return schema;
};

/**
 * Input validation utilities to prevent SQL injection and other attacks
 */

// Whitelist of allowed column names for caravans table
const ALLOWED_CARAVAN_COLUMNS = new Set([
  'title', 'slug', 'description', 'year', 'price', 'status', 'featured',
  // Sleeping & Basic (Phase 1 & 2)
  'beds_count', 'shower_type', 'toilet_type', 'bed_layout', 'windows_count', 'door_position',
  // Legacy fields (kept for backwards compatibility)
  'has_shower', 'has_toilet',
  // Water systems
  'fresh_water_tank_l', 'grey_water_tank_l', 'has_hot_water', 'water_heater_type', 'boiler_volume_l',
  // Kitchen (Phase 1 & 2)
  'fridge_type', 'fridge_volume_l', 'sink_present', 'cooktop_type', 'stove_burners_count',
  // Legacy kitchen (kept for backwards compatibility)
  'has_cooktop', 'has_oven', 'kitchen_outlets_count',
  // Heating & Climate (Phase 1 & 2)
  'heating_type', 'heating_source', 'has_ac', 'vent_fans_count', 'skylights_count',
  // Legacy heating (kept for backwards compatibility)
  'has_heating', 'heater_brand', 'heating_distribution',
  // Insulation & Comfort
  'has_insulation', 'double_glazed_windows', 'winter_rated',
  // Electrical System (Phase 1 & 2)
  'battery_type', 'battery_capacity_ah', 'solar_wattage', 'inverter_wattage', 'has_shore_power', 'has_12v_system',
  // Legacy electrical (kept for backwards compatibility)
  'has_solar_panels',
  // Gas System (Phase 1)
  'gas_system_present', 'gas_bottles_count',
  // Dimensions & Weight
  'length_mm', 'width_mm', 'height_mm', 'interior_height_mm', 'weight_empty_kg', 'max_weight_kg',
  // Chassis & Towing (Phase 1)
  'axles_count', 'brake_type', 'suspension_type', 'wheel_size_inch', 'hitch_weight_kg', 'braked', 'stabilizer_present', 'recommended_tow_vehicle_min_kg', 'license_requirement',
  // Legacy chassis (kept for backwards compatibility)
  'axle_type',
  // Condition & History (Phase 1)
  'condition', 'damp_detected', 'last_service_date', 'ownership_count',
  // Flexible features
  'features'
]);

// Whitelist of allowed column names for images table
const ALLOWED_IMAGE_COLUMNS = new Set([
  'caravan_id', 'url', 'alt_text', 'sort_order'
]);

// Whitelist of allowed caravan statuses
const ALLOWED_STATUSES = new Set(['available', 'sold', 'reserved', 'pending']);

/**
 * Validate column name against whitelist
 * @param {string} columnName - Column name to validate
 * @param {Set} allowedColumns - Set of allowed column names
 * @returns {boolean} True if column is allowed
 */
export const validateColumnName = (columnName, allowedColumns) => {
  if (typeof columnName !== 'string') return false;
  // Remove any SQL comments or special characters
  const sanitized = columnName.trim();
  return allowedColumns.has(sanitized);
};

/**
 * Validate slug format (alphanumeric, hyphens, and underscores only)
 * @param {string} slug - Slug to validate
 * @returns {boolean} True if slug format is valid
 */
export const validateSlug = (slug) => {
  if (typeof slug !== 'string' || slug.length === 0) return false;
  // Allow lowercase, numbers, hyphens, and underscores only
  return /^[a-z0-9\-_]{1,255}$/.test(slug.toLowerCase());
};

/**
 * Validate integer value
 * @param {*} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} True if value is a valid integer within range
 */
export const validateInteger = (value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => {
  const num = parseInt(value);
  return Number.isInteger(num) && num >= min && num <= max;
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
export const validateUrl = (url) => {
  if (typeof url !== 'string' || url.length === 0) return false;
  try {
    new URL(url);
    return true;
  } catch {
    // Allow relative URLs for images
    return /^[a-zA-Z0-9\-_.~:/?#[\]@!$&'()*+,;=%]+$/.test(url);
  }
};

/**
 * Validate caravan status
 * @param {string} status - Status to validate
 * @returns {boolean} True if status is allowed
 */
export const validateStatus = (status) => {
  return ALLOWED_STATUSES.has(status);
};

/**
 * Validate boolean value
 * @param {*} value - Value to validate
 * @returns {boolean} True if value is a boolean or can be converted to one
 */
export const validateBoolean = (value) => {
  return typeof value === 'boolean' || value === 0 || value === 1 || value === '0' || value === '1';
};

/**
 * Sanitize string input (removes null bytes and excessive whitespace)
 * @param {string} str - String to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export const sanitizeString = (str, maxLength = 1000) => {
  if (typeof str !== 'string') return '';
  // Remove null bytes
  let sanitized = str.replace(/\0/g, '');
  // Trim whitespace
  sanitized = sanitized.trim();
  // Truncate to max length
  return sanitized.substring(0, maxLength);
};

/**
 * Validate caravan data for creation/update
 * @param {object} data - Data object to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {object} Result with isValid boolean and errors array
 */
export const validateCaravanData = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate) {
    // Check required fields for creation
    if (!data.title || typeof data.title !== 'string') {
      errors.push('Title is required and must be a string');
    } else if (data.title.length > 255) {
      errors.push('Title must be 255 characters or less');
    }

    if (!data.slug || !validateSlug(data.slug)) {
      errors.push('Slug is required and must contain only lowercase letters, numbers, hyphens, and underscores');
    }

    if (!data.price || !validateInteger(data.price, 0, 100000000)) {
      errors.push('Price is required and must be a number between 0 and 100,000,000');
    }
  }

  // Validate optional fields if provided
  if (data.slug && !validateSlug(data.slug)) {
    errors.push('Slug format is invalid');
  }

  if (data.price !== undefined && !validateInteger(data.price, 0, 100000000)) {
    errors.push('Price must be a number between 0 and 100,000,000');
  }

  if (data.status && !validateStatus(data.status)) {
    errors.push('Status is not allowed');
  }

  if (data.year !== undefined && data.year !== null && data.year !== '' && !validateInteger(data.year, 1950, 2100)) {
    errors.push('Year must be between 1950 and 2100');
  }

  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  } else if (data.description && data.description.length > 5000) {
    errors.push('Description must be 5000 characters or less');
  }

  // Validate boolean fields
  const booleanFields = [
    'featured', 'has_shower', 'has_toilet', 'has_hot_water', 'sink_present',
    'has_cooktop', 'has_oven', 'has_heating', 'has_insulation', 'double_glazed_windows',
    'winter_rated', 'has_solar_panels', 'has_shore_power', 'has_12v_system'
  ];

  for (const field of booleanFields) {
    // Only validate if field has a value (skip empty strings for optional fields)
    if (data[field] !== undefined && data[field] !== '' && !validateBoolean(data[field])) {
      errors.push(`${field} must be a boolean value`);
    }
  }

  // Validate integer fields - allow empty values for optional fields
  const integerFields = [
    'beds_count', 'fresh_water_tank_l', 'grey_water_tank_l', 'boiler_volume_l',
    'fridge_volume_l', 'stove_burners_count', 'battery_capacity_ah', 'solar_wattage',
    'inverter_wattage', 'length_mm', 'width_mm', 'height_mm', 'interior_height_mm',
    'weight_empty_kg', 'max_weight_kg'
  ];

  for (const field of integerFields) {
    // Only validate if field has a value (not empty, null, or undefined)
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      if (!validateInteger(data[field], 0, 100000000)) {
        errors.push(`${field} must be a valid number`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Filter data to only include allowed columns
 * @param {object} data - Data object to filter
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {object} Filtered data with only allowed columns
 */
export const filterCaravanData = (data, isUpdate = false) => {
  if (!data || typeof data !== 'object') return {};

  const filtered = {};

  for (const key of Object.keys(data)) {
    if (validateColumnName(key, ALLOWED_CARAVAN_COLUMNS)) {
      filtered[key] = data[key];
    }
  }

  return filtered;
};

/**
 * Validate image data for creation/update
 * @param {object} data - Data object to validate
 * @returns {object} Result with isValid boolean and errors array
 */
export const validateImageData = (data) => {
  const errors = [];

  if (!data.url || !validateUrl(data.url)) {
    errors.push('URL is required and must be a valid URL');
  }

  if (data.alt_text && typeof data.alt_text !== 'string') {
    errors.push('Alt text must be a string');
  } else if (data.alt_text && data.alt_text.length > 500) {
    errors.push('Alt text must be 500 characters or less');
  }

  if (data.sort_order !== undefined && !validateInteger(data.sort_order, 0, 10000)) {
    errors.push('Sort order must be a valid number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Filter image data to only include allowed columns
 * @param {object} data - Data object to filter
 * @returns {object} Filtered data with only allowed columns
 */
export const filterImageData = (data) => {
  if (!data || typeof data !== 'object') return {};

  const filtered = {};

  for (const key of Object.keys(data)) {
    if (validateColumnName(key, ALLOWED_IMAGE_COLUMNS)) {
      filtered[key] = data[key];
    }
  }

  return filtered;
};

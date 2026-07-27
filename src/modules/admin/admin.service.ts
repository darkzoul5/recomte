import { caravans, images, features } from '../../../db/db.ts';

const FEATURE_FLAGS = new Set([
  'air_conditioning',
  'awning',
  'bike_rack',
  'mosquito_nets',
  'tv_mount'
]);

const RESERVED_FEATURE_KEYS = new Set([
  ...FEATURE_FLAGS,
  'bed_types',
  'kitchen_appliances'
]);

const collectCustomFeatureItems = (featureMap: Record<string, any>) => {
  if (!featureMap || typeof featureMap !== 'object') return [];

  return Object.entries(featureMap)
    .filter(([key]) => !RESERVED_FEATURE_KEYS.has(key))
    .map(([key, value]) => ({ key, value }));
};

export const hydrateAdminCaravan = (caravan: any) => {
  if (!caravan) return null;

  const caravanImages = images.getByCaravanId(caravan.id);
  const featureRows = features.getByCaravanId(caravan.id);
  const featureMap: Record<string, any> = {};
  const featureFlags = [];

  for (const row of featureRows) {
    featureMap[row.feature_key] = row.feature_value;
    if (FEATURE_FLAGS.has(row.feature_key) && row.feature_value !== '0') {
      featureFlags.push(row.feature_key);
    }
  }

  let bedTypes = [];
  if (featureMap.bed_types) {
    try {
      const parsed = JSON.parse(featureMap.bed_types);
      bedTypes = Array.isArray(parsed) ? parsed : [];
    } catch {
      bedTypes = [];
    }
  }

  const parseMultiValueField = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [trimmed];
    }
    return [];
  };

  return {
    ...caravan,
    ...featureMap,
    fridge_type_values: parseMultiValueField(caravan.fridge_type),
    heating_type_values: parseMultiValueField(caravan.heating_type),
    water_heater_type_values: parseMultiValueField(caravan.water_heater_type),
    kitchen_appliances_values: parseMultiValueField(caravan.kitchen_appliances),
    bed_types: bedTypes,
    images: caravanImages,
    features: featureFlags,
    feature_map: featureMap,
    custom_features_items: collectCustomFeatureItems(featureMap)
  };
};

// Feature processing: converts form field names to database feature objects
export const processFeatures = (data: Record<string, any>) => {
  const features: Record<string, any> = {};
  const reservedFeatureKeys = new Set([
    'air_conditioning',
    'awning',
    'bike_rack',
    'mosquito_nets',
    'tv_mount',
    'bed_types'
  ]);
  const featureMap = {
    features_air_conditioning: 'air_conditioning',
    features_awning: 'awning',
    features_bike_rack: 'bike_rack',
    features_mosquito_nets: 'mosquito_nets',
    features_tv_mount: 'tv_mount'
  };

  const bedTypeMap = {
    bed_type_bunk: 'bunk',
    bed_type_twin: 'twin',
    bed_type_dinette: 'dinette',
    bed_type_double: 'double'
  };

  for (const [key, featureName] of Object.entries(featureMap)) {
    if (data[key]) {
      features[featureName] = 1;
    }
    delete data[key];
  }

  if (data.bed_types_json) {
    try {
      const bedTypes = JSON.parse(data.bed_types_json);
      if (Array.isArray(bedTypes) && bedTypes.length > 0) {
        features.bed_types = JSON.stringify(bedTypes);
      }
    } catch {
      // Ignore invalid JSON payload and fallback to legacy checkboxes.
    }
    delete data.bed_types_json;
  } else {
    const bedTypes = [];
    for (const [formKey, bedValue] of Object.entries(bedTypeMap)) {
      if (data[formKey]) {
        bedTypes.push(bedValue);
      }
      delete data[formKey];
    }
    if (bedTypes.length > 0) {
      features.bed_types = JSON.stringify(bedTypes);
    }
  }

  for (const formKey of Object.keys(bedTypeMap)) {
    delete data[formKey];
  }

  // Do not touch kitchen_appliances here; it is handled in mapFormToCaravanData

  const customFeaturesPayload = typeof data.custom_features_json === 'string'
    ? data.custom_features_json
    : (typeof data.custom_features === 'string' ? data.custom_features : '');
  delete data.custom_features_json;
  delete data.custom_features;

  let parsedCustomFeatures = [];
  if (customFeaturesPayload) {
    try {
      const parsed = JSON.parse(customFeaturesPayload);
      parsedCustomFeatures = Array.isArray(parsed) ? parsed : [];
    } catch {
      parsedCustomFeatures = [];
    }
  }

  if (parsedCustomFeatures.length === 0 && typeof customFeaturesPayload === 'string' && customFeaturesPayload.includes('\n')) {
    for (const line of customFeaturesPayload.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const separatorIndex = trimmed.indexOf('=') >= 0 ? trimmed.indexOf('=') : trimmed.indexOf(':');
      let key = trimmed;
      let value = '1';

      if (separatorIndex >= 0) {
        key = trimmed.slice(0, separatorIndex).trim();
        value = trimmed.slice(separatorIndex + 1).trim();
      }

      parsedCustomFeatures.push({ key, value });
    }
  }

  for (const entry of parsedCustomFeatures) {
    if (!entry || typeof entry !== 'object') continue;

    const key = typeof entry.key === 'string' ? entry.key.trim() : '';
    const value = entry.value === undefined || entry.value === null || entry.value === '' ? '1' : String(entry.value);

    if (!key || reservedFeatureKeys.has(key)) {
      continue;
    }

    features[key] = value;
  }

  data.features = Object.keys(features).length > 0 ? features : {};
  return data;
};

// Convert form data to caravan database model
export const mapFormToCaravanData = (formData: Record<string, any>) => {
  const normalizeMultiSelect = (value, allowedValues) => {
    const values = Array.isArray(value) ? value : (value ? [value] : []);
    return values
      .map((entry) => String(entry).trim())
      .filter((entry) => allowedValues.includes(entry));
  };

  const allowedFridgeTypes = [
    '3-режимный (газ/12В/230В)',
    '2-режимный (газ/230В)',
    'Компрессорный (12В)',
    'Электрический (230В)',
    'Газовый',
    'Термобокс'
  ];
  const fridgeType = typeof formData.fridge_type === 'string' && allowedFridgeTypes.includes(formData.fridge_type)
    ? formData.fridge_type
    : null;
  const heatingTypes = normalizeMultiSelect(formData.heating_type, ['diesel', 'gas', 'electric']);
  const waterHeaterTypes = normalizeMultiSelect(formData.water_heater_type, ['electric', 'gas']);
  const kitchenAppliances = normalizeMultiSelect(formData.kitchen_appliances, ['microwave', 'oven', 'grill']);

  return {
    title: formData.title,
    brand: formData.brand || null,
    slug: formData.slug,
    description: formData.description || '',
    year: formData.year ? parseInt(formData.year) : null,
    price: parseInt(formData.price),
    status: formData.status || 'available',
    featured: formData.featured ? 1 : 0,
    beds_count: formData.beds_count ? parseInt(formData.beds_count) : null,
    shower_type: formData.shower_type || null,
    has_toilet: formData.has_toilet ? 1 : 0,
    toilet_type: formData.has_toilet ? 'present' : null,
    windows_count: formData.windows_count ? parseInt(formData.windows_count) : null,
    door_position: formData.door_position || null,
    manufacturer_country: formData.manufacturer_country || null,
    fresh_water_tank_l: formData.fresh_water_tank_l ? parseInt(formData.fresh_water_tank_l) : null,
    grey_water_tank_l: formData.grey_water_tank_l ? parseInt(formData.grey_water_tank_l) : null,
    has_hot_water: formData.has_hot_water ? 1 : 0,
    water_heater_type: waterHeaterTypes.length > 0 ? JSON.stringify(waterHeaterTypes) : null,
    boiler_volume_l: formData.boiler_volume_l ? parseInt(formData.boiler_volume_l) : null,
    fridge_type: fridgeType,
    fridge_volume_l: formData.fridge_volume_l ? parseInt(formData.fridge_volume_l) : null,
    sink_present: formData.sink_present ? 1 : 0,
    cooktop_type: null,
    stove_burners_count: formData.stove_burners_count ? parseInt(formData.stove_burners_count) : null,
    kitchen_appliances: kitchenAppliances.length > 0 ? JSON.stringify(kitchenAppliances) : null,
    heating_type: heatingTypes.length > 0 ? JSON.stringify(heatingTypes) : null,
    heating_distribution: formData.heating_distribution || null,
    heater_brand: formData.heater_brand || null,
    has_ac: formData.has_ac ? 1 : 0,
    vent_fans_count: formData.vent_fans_count ? parseInt(formData.vent_fans_count) : null,
    skylights_count: formData.skylights_count ? parseInt(formData.skylights_count) : null,
    camper_season: formData.camper_season || 'summer',
    double_glazed_windows: formData.double_glazed_windows ? 1 : 0,
    battery_type: formData.battery_type || null,
    battery_capacity_ah: formData.battery_capacity_ah ? parseInt(formData.battery_capacity_ah) : null,
    solar_wattage: formData.solar_wattage ? parseInt(formData.solar_wattage) : null,
    inverter_wattage: formData.inverter_wattage ? parseInt(formData.inverter_wattage) : null,
    has_12v_system: formData.has_12v_system ? 1 : 0,
    length_mm: formData.length_mm ? parseInt(formData.length_mm) : null,
    length_with_hitch_mm: formData.length_with_hitch_mm ? parseInt(formData.length_with_hitch_mm) : null,
    length_without_hitch_mm: formData.length_without_hitch_mm ? parseInt(formData.length_without_hitch_mm) : null,
    width_mm: formData.width_mm ? parseInt(formData.width_mm) : null,
    height_mm: formData.height_mm ? parseInt(formData.height_mm) : null,
    interior_height_mm: formData.interior_height_mm ? parseInt(formData.interior_height_mm) : null,
    curb_weight_kg: formData.curb_weight_kg ? parseInt(formData.curb_weight_kg) : null,
    gross_weight_kg: formData.gross_weight_kg ? parseInt(formData.gross_weight_kg) : null,
    axles_count: formData.axles_count ? parseInt(formData.axles_count) : null,
    brake_type: formData.brake_type || null,
    suspension_type: formData.suspension_type || null,
    wheel_size_inch: formData.wheel_size_inch ? parseInt(formData.wheel_size_inch) : null,
    hitch_weight_kg: null,
    braked: formData.braked ? 1 : 0,
    stabilizer_present: formData.stabilizer_present ? 1 : 0,
    condition: formData.condition || null,
    last_service_date: formData.last_service_date || null,
    features: formData.features || {}
  };
};

// Reorder caravan images
export const applyImageOrder = (caravanId, imageOrder) => {
  if (!imageOrder) return;

  const requestedIds = String(imageOrder)
    .split(',')
    .map((value) => parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (requestedIds.length === 0) return;

  const validImageIds = new Set(images.getByCaravanId(caravanId).map((image) => image.id));

  requestedIds.forEach((imageId, index) => {
    if (validImageIds.has(imageId)) {
      images.reorder(imageId, index);
    }
  });
};

// Get all caravans (for admin dashboard)
export const getAllCaravansForAdmin = () => {
  return caravans.getAll().map(hydrateAdminCaravan);
};

// Get caravan by ID
export const getCaravanById = (caravanId) => {
  return hydrateAdminCaravan(caravans.getById(parseInt(caravanId)));
};

// Create new caravan
export const createCaravan = (caravanData) => {
  return caravans.create(caravanData);
};

// Update caravan
export const updateCaravan = (caravanId, caravanData) => {
  return caravans.update(parseInt(caravanId), caravanData);
};

// Delete caravan
export const deleteCaravan = (caravanId) => {
  const caravanImages = images.getByCaravanId(parseInt(caravanId));
  for (const image of caravanImages) {
    images.delete(image.id, true);
  }
  return caravans.delete(parseInt(caravanId));
};

export const createCaravanImage = (caravanId, imageData) => {
  return images.create(
    parseInt(caravanId, 10),
    imageData.url,
    imageData.alt_text || '',
    imageData.sort_order || 0,
    imageData.width || null,
    imageData.height || null
  );
};

export const deleteCaravanImage = (imageId, deleteFile = true) => {
  return images.delete(parseInt(imageId, 10), deleteFile);
};

export const reorderCaravanImage = (imageId, sortOrder) => {
  return images.reorder(parseInt(imageId, 10), sortOrder);
};

// Update caravan status (hide/show)
export const updateCaravanStatus = (caravanId, newStatus) => {
  const caravan = caravans.getById(parseInt(caravanId));
  if (!caravan) return null;
  return caravans.update(parseInt(caravanId), { status: newStatus });
};

import { caravans, images, features } from '../../../db/db.js';

export const hydrateCaravan = (caravan) => {
  const caravanImages = images.getByCaravanId(caravan.id);
  const featureRows = features.getByCaravanId(caravan.id);
  const featureMap = {};

  for (const row of featureRows) {
    featureMap[row.feature_key] = row.feature_value;
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
    bed_types: bedTypes,
    images: caravanImages,
    feature_map: featureMap,
    features: Object.keys(featureMap).filter((key) => featureMap[key] !== '0')
  };
};

export const getAllCaravans = (filters = {}) => {
  const allCaravans = caravans.getAll(filters);
  return allCaravans.filter((caravan) => caravan.status !== 'hidden');
};

export const getCaravanBySlug = (slug) => {
  const caravan = caravans.getBySlug(slug);
  if (!caravan || caravan.status === 'hidden') {
    return null;
  }
  return caravan;
};

export const getFeaturedCaravans = (limit = 6) => {
  const featuredCaravans = caravans.getFeatured(limit);
  return featuredCaravans.filter((caravan) => caravan.status !== 'hidden');
};

export const searchCaravansByFeature = (featureKey, featureValue = null) => {
  const ids = new Set(features.getByKeyValue(featureKey, featureValue).map((row) => row.caravan_id));
  const allCaravans = getAllCaravans();
  return allCaravans.filter((caravan) => ids.has(caravan.id));
};

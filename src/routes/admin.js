import { caravans, images, features } from '../../db/db.js';
import { isAdmin, requireCsrfToken } from '../middleware/auth.js';
import { validateCaravanData, validateImageData, validateInteger } from '../utils/validation.js';

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

const serializeCustomFeatures = (featureMap) => {
  if (!featureMap || typeof featureMap !== 'object') return '';

  return Object.entries(featureMap)
    .filter(([key]) => !RESERVED_FEATURE_KEYS.has(key))
    .map(([key, value]) => `${key} = ${value}`)
    .join('\n');
};

const collectCustomFeatureItems = (featureMap) => {
  if (!featureMap || typeof featureMap !== 'object') return [];

  return Object.entries(featureMap)
    .filter(([key]) => !RESERVED_FEATURE_KEYS.has(key))
    .map(([key, value]) => ({ key, value }));
};

const hydrateCaravan = (caravan) => {
  const caravanImages = images.getByCaravanId(caravan.id);
  const featureRows = features.getByCaravanId(caravan.id);

  const featureMap = {};
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
    custom_features_text: serializeCustomFeatures(featureMap),
    custom_features_items: collectCustomFeatureItems(featureMap)
  };
};

// Helper function to convert feature checkboxes to features array
const processFeatures = (data) => {
  const features = {};
  const featureMap = {
    'features_air_conditioning': 'air_conditioning',
    'features_awning': 'awning',
    'features_bike_rack': 'bike_rack',
    'features_mosquito_nets': 'mosquito_nets',
    'features_tv_mount': 'tv_mount'
  };

  for (const [key, featureName] of Object.entries(featureMap)) {
    if (data[key]) {
      features[featureName] = 1;
    } else {
      delete data[key];
    }
    delete data[key];
  }

  const bedTypes = [];
  const bedTypeMap = {
    bed_type_bunk: 'bunk',
    bed_type_twin: 'twin',
    bed_type_dinette: 'dinette',
    bed_type_double: 'double'
  };

  for (const [formKey, bedValue] of Object.entries(bedTypeMap)) {
    if (data[formKey]) {
      bedTypes.push(bedValue);
    }
    delete data[formKey];
  }

  if (bedTypes.length > 0) {
    features.bed_types = JSON.stringify(bedTypes);
  }

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

    if (!key || RESERVED_FEATURE_KEYS.has(key)) {
      continue;
    }

    features[key] = value;
  }

  data.features = features;

  return data;
};

export default async function adminRoutes(fastify) {

  // GET /admin/api/caravans - list all caravans (including sold) for admin
  fastify.get('/admin/api/caravans', { onRequest: [isAdmin] }, async (request, reply) => {
    try {
      const allCaravans = caravans.getAll();

      const caravansWithImages = allCaravans.map(hydrateCaravan);

      return { caravans: caravansWithImages };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch caravans' });
    }
  });

  // GET /admin/api/caravans/:id - get single caravan by ID for editing
  fastify.get('/admin/api/caravans/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Validate ID
      if (!validateInteger(parseInt(id), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid caravan ID' });
      }

      const caravan = caravans.getById(parseInt(id));

      if (!caravan) {
        return reply.status(404).send({ error: 'Caravan not found' });
      }

      return hydrateCaravan(caravan);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch caravan' });
    }
  });

  // POST /admin/api/caravans - create new caravan
  fastify.post('/admin/api/caravans', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      let data = request.body;

      // Process features from checkboxes
      data = processFeatures(data);

      // Validate required fields
      if (!data.title || !data.slug || !data.price) {
        return reply.status(400).send({ error: 'Title, slug, and price required' });
      }

      // Validate all data
      const validation = validateCaravanData(data, false);
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.errors.join('; ') });
      }

      const newCaravan = caravans.create(data);
      return { success: true, caravan: newCaravan };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to create caravan' });
    }
  });

  // PUT /admin/api/caravans/:id - update caravan
  fastify.put('/admin/api/caravans/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;
      let data = request.body;

      // Validate ID
      if (!validateInteger(parseInt(id), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid caravan ID' });
      }

      // Process features from checkboxes
      data = processFeatures(data);

      const updated = caravans.update(parseInt(id), data);
      return { success: true, caravan: updated };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to update caravan' });
    }
  });

  // DELETE /admin/api/caravans/:id - delete caravan
  fastify.delete('/admin/api/caravans/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate ID
      if (!validateInteger(parseInt(id), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid caravan ID' });
      }

      caravans.delete(parseInt(id));
      return { success: true, message: 'Caravan deleted' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to delete caravan' });
    }
  });

  // POST /admin/api/caravans/:id/images - add image to caravan
  fastify.post('/admin/api/caravans/:id/images', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { url, alt_text, sort_order } = request.body;

      // Validate caravan ID
      if (!validateInteger(parseInt(id), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid caravan ID' });
      }

      if (!url) {
        return reply.status(400).send({ error: 'URL required' });
      }

      // Validate image data
      const validation = validateImageData({ url, alt_text, sort_order });
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.errors.join('; ') });
      }

      const newImage = images.create(
        parseInt(id),
        url,
        alt_text || '',
        sort_order || 0
      );
      return { success: true, image: newImage };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to create image' });
    }
  });

  // DELETE /admin/api/images/:id - delete image
  fastify.delete('/admin/api/images/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate image ID
      if (!validateInteger(parseInt(id), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid image ID' });
      }

      images.delete(parseInt(id), true); // true = delete file from disk
      return { success: true, message: 'Image deleted' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to delete image' });
    }
  });

  // PUT /admin/api/images/:id/reorder - reorder image
  fastify.put('/admin/api/images/:id/reorder', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { sort_order } = request.body;

      // Validate image ID
      if (!validateInteger(parseInt(id), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid image ID' });
      }

      if (sort_order === undefined) {
        return reply.status(400).send({ error: 'sort_order required' });
      }

      // Validate sort order
      if (!validateInteger(sort_order, 0, 10000)) {
        return reply.status(400).send({ error: 'Invalid sort order' });
      }

      images.reorder(parseInt(id), sort_order);
      return { success: true, message: 'Image reordered' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to reorder image' });
    }
  });
}

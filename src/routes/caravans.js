import { caravans, images, features } from '../../db/db.js';
import { validateSlug, validateInteger } from '../utils/validation.js';

const hydrateCaravan = (caravan) => {
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

export default async function caravansRoutes(fastify) {
  // GET /api/caravans - list caravans for catalogue
  fastify.get('/api/caravans', async (request, reply) => {
    try {
      const filters = {};
      
      if (request.query.winter_rated === 'true') {
        filters.camper_season = 'winter';
      }
      if (request.query.camper_season) {
        filters.camper_season = String(request.query.camper_season);
      }

      if (request.query.status) {
        filters.status = request.query.status;
      }

      const allCaravans = caravans.getAll(filters);

      let filteredCaravans = allCaravans.filter((caravan) => caravan.status !== 'hidden');
      if (request.query.feature_key) {
        const featureKey = String(request.query.feature_key).trim();
        const featureValue = request.query.feature_value !== undefined
          ? String(request.query.feature_value)
          : null;

        if (featureKey.length > 0) {
          const ids = new Set(features.getByKeyValue(featureKey, featureValue).map((row) => row.caravan_id));
          filteredCaravans = filteredCaravans.filter((caravan) => ids.has(caravan.id));
        }
      }
      
      const caravansWithImages = filteredCaravans.map(hydrateCaravan);

      return { caravans: caravansWithImages };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch caravans' });
    }
  });

  // GET /api/caravans/:slug - get single caravan by slug
  fastify.get('/api/caravans/:slug', async (request, reply) => {
    try {
      const { slug } = request.params;

      // Validate slug format
      if (!validateSlug(slug)) {
        return reply.status(400).send({ error: 'Invalid slug format' });
      }

      const caravan = caravans.getBySlug(slug);

      if (!caravan || caravan.status === 'hidden') {
        return reply.status(404).send({ error: 'Caravan not found' });
      }

      return hydrateCaravan(caravan);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch caravan' });
    }
  });

  // GET /api/featured-caravans - get featured caravans for homepage
  fastify.get('/api/featured-caravans', async (request, reply) => {
    try {
      let limit = 6;
      
      // Validate limit parameter
      if (request.query.limit) {
        const parsedLimit = parseInt(request.query.limit);
        if (validateInteger(parsedLimit, 1, 100)) {
          limit = parsedLimit;
        }
      }

      const featuredCaravans = caravans
        .getFeatured(limit)
        .filter((caravan) => caravan.status !== 'hidden');

      const caravansWithImages = featuredCaravans.map(hydrateCaravan);

      return { caravans: caravansWithImages };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch featured caravans' });
    }
  });
}

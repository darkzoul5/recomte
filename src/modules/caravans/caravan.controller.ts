import { validateSlug, validateInteger } from '../../utils/validation.ts';
import {
  getAllCaravans,
  getCaravanBySlug,
  getFeaturedCaravans,
  hydrateCaravan,
  searchCaravansByFeature
} from './caravan.service.ts';

export const listCaravans = async (request, reply) => {
  try {
    const filters: Record<string, any> = {};
    
    if (request.query.winter_rated === 'true') {
      filters.camper_season = 'all_season';
    }
    if (request.query.camper_season) {
      filters.camper_season = String(request.query.camper_season);
    }

    if (request.query.status) {
      filters.status = request.query.status;
    }

    let filteredCaravans = getAllCaravans(filters);
    
    if (request.query.feature_key) {
      const featureKey = String(request.query.feature_key).trim();
      const featureValue = request.query.feature_value !== undefined
        ? String(request.query.feature_value)
        : null;

      if (featureKey.length > 0) {
        filteredCaravans = searchCaravansByFeature(featureKey, featureValue);
      }
    }
    
    const caravansWithImages = filteredCaravans.map(hydrateCaravan);

    return { caravans: caravansWithImages };
  } catch (error) {
    request.log.error({ err: error }, 'Failed to fetch caravans');
    return reply.status(500).send({ error: 'Failed to fetch caravans' });
  }
};

export const getCaravan = async (request, reply) => {
  try {
    const { slug } = request.params as { slug: string };

    // Validate slug format
    if (!validateSlug(slug)) {
      return reply.status(400).send({ error: 'Invalid slug format' });
    }

    const caravan = getCaravanBySlug(slug);

    if (!caravan) {
      return reply.status(404).send({ error: 'Caravan not found' });
    }

    return hydrateCaravan(caravan);
  } catch (error) {
    request.log.error({ err: error }, 'Failed to fetch caravan');
    return reply.status(500).send({ error: 'Failed to fetch caravan' });
  }
};

export const getFeaturedCatalog = async (request, reply) => {
  try {
    let limit = 6;
    
    // Validate limit parameter
    if (request.query.limit) {
      const parsedLimit = parseInt(request.query.limit);
      if (validateInteger(parsedLimit, 1, 100)) {
        limit = parsedLimit;
      }
    }

    const featuredCaravans = getFeaturedCaravans(limit);
    const caravansWithImages = featuredCaravans.map(hydrateCaravan);

    return { caravans: caravansWithImages };
  } catch (error) {
    request.log.error({ err: error }, 'Failed to fetch featured caravans');
    return reply.status(500).send({ error: 'Failed to fetch featured caravans' });
  }
};

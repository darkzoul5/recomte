import { caravans, images } from '../../db/db.js';
import { validateSlug, validateInteger } from '../utils/validation.js';

export default async function caravansRoutes(fastify) {
  // GET /api/caravans - list all available caravans
  fastify.get('/api/caravans', async (request, reply) => {
    try {
      const filters = {
        status: 'available'
      };
      
      if (request.query.winter_rated === 'true') {
        filters.winter_rated = true;
      }

      const allCaravans = caravans.getAll(filters);
      
      // Enrich with images
      const caravansWithImages = allCaravans.map(caravan => {
        const caravanImages = images.getByCaravanId(caravan.id);
        return {
          ...caravan,
          images: caravanImages,
          features: caravan.features ? JSON.parse(caravan.features) : []
        };
      });

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

      if (!caravan) {
        return reply.status(404).send({ error: 'Caravan not found' });
      }

      const caravanImages = images.getByCaravanId(caravan.id);
      
      return {
        ...caravan,
        images: caravanImages,
        features: caravan.features ? JSON.parse(caravan.features) : []
      };
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

      const featuredCaravans = caravans.getFeatured(limit);

      const caravansWithImages = featuredCaravans.map(caravan => {
        const caravanImages = images.getByCaravanId(caravan.id);
        return {
          ...caravan,
          images: caravanImages,
          features: caravan.features ? JSON.parse(caravan.features) : []
        };
      });

      return { caravans: caravansWithImages };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch featured caravans' });
    }
  });
}

import { caravans, images } from '../../db/db.js';

export default async function caravansRoutes(fastify) {
  // GET /api/caravans - list all available caravans
  fastify.get('/api/caravans', async (request, reply) => {
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
  });

  // GET /api/caravans/:slug - get single caravan by slug
  fastify.get('/api/caravans/:slug', async (request, reply) => {
    const { slug } = request.params;
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
  });

  // GET /api/caravans/featured - get featured caravans for homepage
  fastify.get('/api/featured-caravans', async (request, reply) => {
    const limit = request.query.limit ? parseInt(request.query.limit) : 6;
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
  });
}

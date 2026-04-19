import { caravans, images } from '../../db/db.js';
import { isAdmin } from '../middleware/auth.js';

export default async function adminRoutes(fastify) {

  // GET /admin/api/caravans - list all caravans (including sold) for admin
  fastify.get('/admin/api/caravans', { onRequest: [isAdmin] }, async (request, reply) => {
    const allCaravans = caravans.getAll();

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

  // GET /admin/api/caravans/:id - get single caravan by ID for editing
  fastify.get('/admin/api/caravans/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const caravan = caravans.getById(parseInt(id));

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

  // POST /admin/api/caravans - create new caravan
  fastify.post('/admin/api/caravans', { onRequest: [isAdmin] }, async (request, reply) => {
    const data = request.body;

    if (!data.title || !data.slug || !data.price) {
      return reply.status(400).send({ error: 'Title, slug, and price required' });
    }

    try {
      const newCaravan = caravans.create(data);
      return { success: true, caravan: newCaravan };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // PUT /admin/api/caravans/:id - update caravan
  fastify.put('/admin/api/caravans/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;

    try {
      const updated = caravans.update(parseInt(id), data);
      return { success: true, caravan: updated };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // DELETE /admin/api/caravans/:id - delete caravan
  fastify.delete('/admin/api/caravans/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    const { id } = request.params;

    try {
      caravans.delete(parseInt(id));
      return { success: true, message: 'Caravan deleted' };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // POST /admin/api/caravans/:id/images - add image to caravan
  fastify.post('/admin/api/caravans/:id/images', { onRequest: [isAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const { url, alt_text, sort_order } = request.body;

    if (!url) {
      return reply.status(400).send({ error: 'URL required' });
    }

    try {
      const newImage = images.create(
        parseInt(id),
        url,
        alt_text || '',
        sort_order || 0
      );
      return { success: true, image: newImage };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // DELETE /admin/api/images/:id - delete image
  fastify.delete('/admin/api/images/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    const { id } = request.params;

    try {
      images.delete(parseInt(id));
      return { success: true, message: 'Image deleted' };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // PUT /admin/api/images/:id/reorder - reorder image
  fastify.put('/admin/api/images/:id/reorder', { onRequest: [isAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const { sort_order } = request.body;

    if (sort_order === undefined) {
      return reply.status(400).send({ error: 'sort_order required' });
    }

    try {
      images.reorder(parseInt(id), sort_order);
      return { success: true, message: 'Image reordered' };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
}

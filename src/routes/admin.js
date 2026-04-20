import { caravans, images } from '../../db/db.js';
import { isAdmin } from '../middleware/auth.js';
import { validateCaravanData, validateImageData, validateInteger } from '../utils/validation.js';

export default async function adminRoutes(fastify) {

  // GET /admin/api/caravans - list all caravans (including sold) for admin
  fastify.get('/admin/api/caravans', { onRequest: [isAdmin] }, async (request, reply) => {
    try {
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

  // POST /admin/api/caravans - create new caravan
  fastify.post('/admin/api/caravans', { onRequest: [isAdmin] }, async (request, reply) => {
    try {
      const data = request.body;

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
  fastify.put('/admin/api/caravans/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate ID
      if (!validateInteger(parseInt(id), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid caravan ID' });
      }

      const updated = caravans.update(parseInt(id), data);
      return { success: true, caravan: updated };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to update caravan' });
    }
  });

  // DELETE /admin/api/caravans/:id - delete caravan
  fastify.delete('/admin/api/caravans/:id', { onRequest: [isAdmin] }, async (request, reply) => {
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
  fastify.post('/admin/api/caravans/:id/images', { onRequest: [isAdmin] }, async (request, reply) => {
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
  fastify.delete('/admin/api/images/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;

      // Validate image ID
      if (!validateInteger(parseInt(id), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid image ID' });
      }

      images.delete(parseInt(id));
      return { success: true, message: 'Image deleted' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to delete image' });
    }
  });

  // PUT /admin/api/images/:id/reorder - reorder image
  fastify.put('/admin/api/images/:id/reorder', { onRequest: [isAdmin] }, async (request, reply) => {
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

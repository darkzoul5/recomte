import { isAdmin, requireCsrfToken } from '../../middleware/auth.js';
import { validateImageData, validateInteger } from '../../utils/validation.js';
import {
  applyImageOrder,
  createCaravan,
  createCaravanImage,
  deleteCaravan,
  deleteCaravanImage,
  getAllCaravansForAdmin,
  getCaravanById,
  mapFormToCaravanData,
  processFeatures,
  reorderCaravanImage,
  updateCaravan
} from './admin.service.js';

export default async function registerAdminApiRoutes(fastify) {
  fastify.get('/admin/api/caravans', { onRequest: [isAdmin] }, async (request, reply) => {
    try {
      return { caravans: getAllCaravansForAdmin() };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch caravans' });
    }
  });

  fastify.get('/admin/api/caravans/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      if (!validateInteger(parseInt(id, 10), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid caravan ID' });
      }

      const caravan = getCaravanById(id);
      if (!caravan) {
        return reply.status(404).send({ error: 'Caravan not found' });
      }

      return caravan;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch caravan' });
    }
  });

  fastify.post('/admin/api/caravans', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const data = mapFormToCaravanData(processFeatures({ ...(request.body || {}) }));

      if (!data.title || !data.slug || !data.price) {
        return reply.status(400).send({ error: 'Title, slug, and price required' });
      }

      const caravan = createCaravan(data);
      return { success: true, caravan };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to create caravan' });
    }
  });

  fastify.put('/admin/api/caravans/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;
      if (!validateInteger(parseInt(id, 10), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid caravan ID' });
      }

      const data = mapFormToCaravanData(processFeatures({ ...(request.body || {}) }));
      const caravan = updateCaravan(id, data);

      if (!caravan) {
        return reply.status(404).send({ error: 'Caravan not found' });
      }

      if (request.body?.image_order) {
        applyImageOrder(parseInt(id, 10), request.body.image_order);
      }

      return { success: true, caravan: getCaravanById(id) };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to update caravan' });
    }
  });

  fastify.delete('/admin/api/caravans/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;
      if (!validateInteger(parseInt(id, 10), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid caravan ID' });
      }

      deleteCaravan(id);
      return { success: true, message: 'Caravan deleted' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to delete caravan' });
    }
  });

  fastify.post('/admin/api/caravans/:id/images', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const imageData = request.body || {};

      if (!validateInteger(parseInt(id, 10), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid caravan ID' });
      }

      if (!imageData.url) {
        return reply.status(400).send({ error: 'URL required' });
      }

      const validation = validateImageData(imageData);
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.errors.join('; ') });
      }

      const image = createCaravanImage(id, imageData);
      return { success: true, image };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to create image' });
    }
  });

  fastify.delete('/admin/api/images/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;
      if (!validateInteger(parseInt(id, 10), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid image ID' });
      }

      deleteCaravanImage(id, true);
      return { success: true, message: 'Image deleted' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to delete image' });
    }
  });

  fastify.put('/admin/api/images/:id/reorder', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { sort_order } = request.body || {};

      if (!validateInteger(parseInt(id, 10), 1, Number.MAX_SAFE_INTEGER)) {
        return reply.status(400).send({ error: 'Invalid image ID' });
      }

      if (sort_order === undefined) {
        return reply.status(400).send({ error: 'sort_order required' });
      }

      if (!validateInteger(sort_order, 0, 10000)) {
        return reply.status(400).send({ error: 'Invalid sort order' });
      }

      reorderCaravanImage(id, sort_order);
      return { success: true, message: 'Image reordered' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to reorder image' });
    }
  });
}

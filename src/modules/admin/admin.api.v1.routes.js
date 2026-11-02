import { isAdmin, requireCsrfToken } from '../../middleware/auth.js';
import { images } from '../../../db/db.js';
import { validateImageData } from '../../utils/validation.js';
import {
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

const sendError = (reply, statusCode, code, message) => reply.code(statusCode).send({
  error: { code, message }
});

const parseId = (value) => {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};

const handleWriteError = (request, reply, error, fallbackMessage) => {
  request.log.error({ err: error }, fallbackMessage);
  if (/validation failed|required|invalid/i.test(error.message)) {
    return sendError(reply, 400, 'VALIDATION_ERROR', error.message);
  }
  if (/unique constraint|already exists/i.test(error.message)) {
    return sendError(reply, 409, 'RESOURCE_CONFLICT', 'A resource with the supplied unique value already exists');
  }
  return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', fallbackMessage);
};

export const registerAdminApiV1Routes = async (fastify) => {
  fastify.get('/api/v1/caravans', { onRequest: [isAdmin] }, async (request, reply) => {
    try {
      return { data: getAllCaravansForAdmin() };
    } catch (error) {
      request.log.error({ err: error }, 'Failed to fetch caravans');
      return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch caravans');
    }
  });

  fastify.get('/api/v1/caravans/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return sendError(reply, 400, 'INVALID_ID', 'Caravan ID must be a positive integer');

    try {
      const caravan = getCaravanById(id);
      if (!caravan) return sendError(reply, 404, 'CARAVAN_NOT_FOUND', 'Caravan not found');
      return { data: caravan };
    } catch (error) {
      request.log.error({ err: error }, 'Failed to fetch caravan');
      return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch caravan');
    }
  });

  fastify.post('/api/v1/caravans', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    try {
      const data = mapFormToCaravanData(processFeatures({ ...(request.body || {}) }));
      if (!data.title || !data.slug || Number.isNaN(data.price)) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Title, slug, and price are required');
      }
      const caravan = createCaravan(data);
      return reply.code(201).send({ data: caravan });
    } catch (error) {
      return handleWriteError(request, reply, error, 'Failed to create caravan');
    }
  });

  fastify.put('/api/v1/caravans/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return sendError(reply, 400, 'INVALID_ID', 'Caravan ID must be a positive integer');

    try {
      const data = mapFormToCaravanData(processFeatures({ ...(request.body || {}) }));
      const caravan = updateCaravan(id, data);
      if (!caravan) return sendError(reply, 404, 'CARAVAN_NOT_FOUND', 'Caravan not found');
      return { data: getCaravanById(id) };
    } catch (error) {
      return handleWriteError(request, reply, error, 'Failed to update caravan');
    }
  });

  fastify.delete('/api/v1/caravans/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return sendError(reply, 400, 'INVALID_ID', 'Caravan ID must be a positive integer');

    try {
      if (!getCaravanById(id)) return sendError(reply, 404, 'CARAVAN_NOT_FOUND', 'Caravan not found');
      deleteCaravan(id);
      return reply.code(204).send();
    } catch (error) {
      return handleWriteError(request, reply, error, 'Failed to delete caravan');
    }
  });

  fastify.post('/api/v1/caravans/:id/images', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return sendError(reply, 400, 'INVALID_ID', 'Caravan ID must be a positive integer');

    try {
      if (!getCaravanById(id)) return sendError(reply, 404, 'CARAVAN_NOT_FOUND', 'Caravan not found');
      const imageData = request.body || {};
      const validation = validateImageData(imageData);
      if (!validation.isValid) {
        return sendError(reply, 400, 'VALIDATION_ERROR', validation.errors.join('; '));
      }
      const image = createCaravanImage(id, imageData);
      return reply.code(201).send({ data: image });
    } catch (error) {
      return handleWriteError(request, reply, error, 'Failed to create image');
    }
  });

  fastify.patch('/api/v1/images/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return sendError(reply, 400, 'INVALID_ID', 'Image ID must be a positive integer');
    const sortOrder = request.body?.sort_order;
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'sort_order must be an integer between 0 and 10000');
    }

    try {
      if (!images.getById(id)) return sendError(reply, 404, 'IMAGE_NOT_FOUND', 'Image not found');
      reorderCaravanImage(id, sortOrder);
      return { data: images.getById(id) };
    } catch (error) {
      return handleWriteError(request, reply, error, 'Failed to update image');
    }
  });

  fastify.delete('/api/v1/images/:id', { onRequest: [isAdmin], preHandler: [requireCsrfToken] }, async (request, reply) => {
    const id = parseId(request.params.id);
    if (!id) return sendError(reply, 400, 'INVALID_ID', 'Image ID must be a positive integer');

    try {
      if (!images.getById(id)) return sendError(reply, 404, 'IMAGE_NOT_FOUND', 'Image not found');
      deleteCaravanImage(id, true);
      return reply.code(204).send();
    } catch (error) {
      return handleWriteError(request, reply, error, 'Failed to delete image');
    }
  });
}

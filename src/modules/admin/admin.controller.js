import {
  processFeatures,
  mapFormToCaravanData,
  applyImageOrder,
  getAllCaravansForAdmin,
  getCaravanById,
  createCaravan,
  updateCaravan,
  deleteCaravan,
  updateCaravanStatus
} from './admin.service.js';
import { parseMultipartForm, handleImageUploads } from './upload.service.js';
import { rejectInvalidCsrf, requireAdminSession } from './admin.helpers.js';
import { ensureCsrfToken } from '../auth/auth.middleware.js';

export const renderEditPage = async (request, reply, title, caravan, isNew, error) => reply.view('pages/admin/edit', {
  title,
  caravan,
  isNew,
  error,
  csrfToken: ensureCsrfToken(request)
});

export const getDashboard = async (request, reply, fastify) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    const response = await fastify.inject({
      method: 'GET',
      url: '/admin/api/caravans',
      headers: {
        cookie: request.headers.cookie || ''
      }
    });

    const data = JSON.parse(response.body);
    return reply.view('pages/admin/dashboard', {
      title: 'Панель управления',
      caravans: data.caravans || [],
      csrfToken: ensureCsrfToken(request)
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.view('pages/admin/dashboard', {
      title: 'Панель управления',
      caravans: [],
      csrfToken: ensureCsrfToken(request)
    });
  }
};

export const getEditPage = async (request, reply, fastify) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    const { id } = request.params;
    const response = await fastify.inject({
      method: 'GET',
      url: `/admin/api/caravans/${id}`,
      headers: {
        cookie: request.headers.cookie || ''
      }
    });

    if (response.statusCode === 404) {
      return reply.code(404).send({ message: 'Caravan not found' });
    }

    const caravan = JSON.parse(response.body);
    return reply.view('pages/admin/edit', {
      title: `Редактировать: ${caravan.title}`,
      caravan,
      isNew: false,
      error: null,
      csrfToken: ensureCsrfToken(request)
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ message: 'Error loading caravan' });
  }
};

export const getNewPage = async (request, reply) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  return renderEditPage(request, reply, 'Добавить', {
    id: null,
    title: '',
    slug: '',
    description: '',
    year: new Date().getFullYear(),
    price: 0,
    status: 'available',
    featured: 0,
    beds_count: 0,
    has_shower: 0,
    has_toilet: 0,
    images: []
  }, true, null);
};

export const postCreateCaravan = async (request, reply, rootDir, fastify) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    const { formData, uploadedFiles } = await parseMultipartForm(request);

    if (rejectInvalidCsrf(request, reply, formData)) {
      return renderEditPage(request, reply, 'Добавить', {
        title: '',
        slug: '',
        price: 0,
        status: 'available',
        featured: 0,
        images: []
      }, true, 'Недействительный токен безопасности. Обновите страницу и попробуйте снова.');
    }

    if (!formData.title || !formData.slug || !formData.price) {
      return renderEditPage(request, reply, 'Добавить', {
        title: '',
        slug: '',
        price: 0,
        status: 'available',
        featured: 0,
        images: []
      }, true, 'Заполните обязательные поля: название, slug и цена');
    }

    const processedForm = processFeatures({ ...formData });
    const newCaravan = createCaravan(mapFormToCaravanData(processedForm));

    await handleImageUploads(newCaravan.id, uploadedFiles, rootDir, fastify.log);

    return reply.redirect('/admin/dash');
  } catch (error) {
    fastify.log.error(error);
    return renderEditPage(request, reply, 'Добавить', {
      title: '',
      slug: '',
      price: 0,
      status: 'available',
      featured: 0,
      images: []
    }, true, `Ошибка при создании: ${error.message}`);
  }
};

export const postUpdateCaravan = async (request, reply, rootDir, fastify) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    const { id } = request.params;
    const caravan = getCaravanById(id);

    if (!caravan) {
      return reply.code(404).send({ message: 'Caravan not found' });
    }

    const { formData, uploadedFiles } = await parseMultipartForm(request);

    if (rejectInvalidCsrf(request, reply, formData)) {
      return reply.view('pages/admin/edit', {
        title: `Редактировать: ${caravan.title}`,
        caravan,
        isNew: false,
        error: 'Недействительный токен безопасности. Обновите страницу и попробуйте снова.',
        csrfToken: ensureCsrfToken(request)
      });
    }

    const processedForm = processFeatures({ ...formData });
    updateCaravan(parseInt(id), mapFormToCaravanData(processedForm));

    if (formData.images_to_delete) {
      const imagesToDelete = Array.isArray(formData.images_to_delete)
        ? formData.images_to_delete
        : [formData.images_to_delete];

      for (const imageId of imagesToDelete) {
        if (imageId) {
          // Import images here to delete them
          const { images } = await import('../../db/db.js');
          images.delete(parseInt(imageId), true);
        }
      }
    }

    applyImageOrder(parseInt(id), formData.image_order);
    await handleImageUploads(parseInt(id), uploadedFiles, rootDir, fastify.log);

    return reply.redirect(`/admin/edit/${id}`);
  } catch (error) {
    fastify.log.error(error);
    const { id } = request.params;
    const response = await fastify.inject({
      method: 'GET',
      url: `/admin/api/caravans/${id}`,
      headers: {
        cookie: request.headers.cookie || ''
      }
    });
    const caravan = JSON.parse(response.body);

    return reply.view('pages/admin/edit', {
      title: `Редактировать: ${caravan.title}`,
      caravan,
      isNew: false,
      error: `Ошибка при обновлении: ${error.message}`,
      csrfToken: ensureCsrfToken(request)
    });
  }
};

export const postDelistCaravan = async (request, reply) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    const { id } = request.params;

    if (rejectInvalidCsrf(request, reply)) {
      return reply.code(403).send({ error: 'Invalid CSRF token' });
    }

    updateCaravanStatus(id, 'hidden');
    return reply.redirect(`/admin/edit/${id}`);
  } catch (error) {
    request.server.log.error(error);
    return reply.code(500).send({ error: 'Failed to delist caravan' });
  }
};

export const postRelistCaravan = async (request, reply) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    const { id } = request.params;

    if (rejectInvalidCsrf(request, reply)) {
      return reply.code(403).send({ error: 'Invalid CSRF token' });
    }

    updateCaravanStatus(id, 'available');
    return reply.redirect(`/admin/edit/${id}`);
  } catch (error) {
    request.server.log.error(error);
    return reply.code(500).send({ error: 'Failed to relist caravan' });
  }
};

export const postDeleteCaravan = async (request, reply) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    const { id } = request.params;

    if (rejectInvalidCsrf(request, reply)) {
      return reply.code(403).send({ error: 'Invalid CSRF token' });
    }

    deleteCaravan(id);
    return reply.redirect('/admin/dash');
  } catch (error) {
    request.server.log.error(error);
    return reply.code(500).send({ error: 'Failed to delete caravan' });
  }
};

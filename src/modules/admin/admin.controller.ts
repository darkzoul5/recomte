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
} from './admin.service.ts';
import { parseMultipartForm, handleImageUploads } from './upload.service.ts';
import { rejectInvalidCsrf, requireAdminSession } from './admin.helpers.ts';
import { ensureCsrfToken } from '../auth/auth.middleware.ts';
import { images } from '../../../db/db.ts';

const ADMIN_TITLE = '\u041f\u0430\u043d\u0435\u043b\u044c \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f';
const ADD_TITLE = '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c';
const EDIT_PREFIX = '\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c';
const INVALID_CSRF_MESSAGE = '\u041d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0442\u043e\u043a\u0435\u043d \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438. \u041e\u0431\u043d\u043e\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443 \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.';
const REQUIRED_FIELDS_MESSAGE = '\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043f\u043e\u043b\u044f: \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435, slug \u0438 \u0446\u0435\u043d\u0430';
const CREATE_ERROR_PREFIX = '\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0438';
const UPDATE_ERROR_PREFIX = '\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0438';

const buildEditTitle = (caravan) => `${EDIT_PREFIX}: ${caravan.title}`;

const buildEmptyCaravan = () => ({
  id: null,
  title: '',
  brand: '',
  slug: '',
  description: '',
  year: new Date().getFullYear(),
  price: 0,
  status: 'available',
  featured: 0,
  beds_count: 0,
  has_shower: 0,
  has_toilet: 0,
  length_with_hitch_mm: null,
  length_without_hitch_mm: null,
  images: []
});

export const renderEditPage = async (request, reply, title, caravan, isNew, error) => reply.view('pages/admin/edit', {
  title,
  caravan,
  isNew,
  error,
  csrfToken: ensureCsrfToken(request)
});

export const getDashboard = async (request, reply) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    return reply.view('pages/admin/dashboard', {
      title: ADMIN_TITLE,
      caravans: getAllCaravansForAdmin() || [],
      csrfToken: ensureCsrfToken(request)
    });
  } catch (error) {
    request.log.error({ err: error }, 'Failed to load admin dashboard');
    return reply.view('pages/admin/dashboard', {
      title: ADMIN_TITLE,
      caravans: [],
      csrfToken: ensureCsrfToken(request)
    });
  }
};

export const getEditPage = async (request, reply) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    const { id } = request.params;
    const caravan = getCaravanById(id);

    if (!caravan) {
      return reply.code(404).send({ message: 'Caravan not found' });
    }

    return reply.view('pages/admin/edit', {
      title: buildEditTitle(caravan),
      caravan,
      isNew: false,
      error: null,
      csrfToken: ensureCsrfToken(request)
    });
  } catch (error) {
    request.log.error({ err: error }, 'Failed to load caravan edit page');
    return reply.code(500).send({ message: 'Error loading caravan' });
  }
};

export const getNewPage = async (request, reply) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  return renderEditPage(request, reply, ADD_TITLE, buildEmptyCaravan(), true, null);
};

export const postCreateCaravan = async (request, reply) => {
  if (!requireAdminSession(request, reply)) {
    return;
  }

  try {
    const { formData, uploadedFiles } = await parseMultipartForm(request);

    if (rejectInvalidCsrf(request, reply, formData)) {
      return renderEditPage(request, reply, ADD_TITLE, buildEmptyCaravan(), true, INVALID_CSRF_MESSAGE);
    }

    if (!formData.title || !formData.slug || !formData.price) {
      return renderEditPage(request, reply, ADD_TITLE, buildEmptyCaravan(), true, REQUIRED_FIELDS_MESSAGE);
    }

    const processedForm = processFeatures({ ...formData });
    const newCaravan = createCaravan(mapFormToCaravanData(processedForm));

    await handleImageUploads(newCaravan.id, uploadedFiles, request.log);

    return reply.redirect('/admin/dash');
  } catch (error) {
    request.log.error({ err: error }, 'Failed to create caravan');
    return renderEditPage(request, reply, ADD_TITLE, buildEmptyCaravan(), true, `${CREATE_ERROR_PREFIX}: ${error.message}`);
  }
};

export const postUpdateCaravan = async (request, reply) => {
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
        title: buildEditTitle(caravan),
        caravan,
        isNew: false,
        error: INVALID_CSRF_MESSAGE,
        csrfToken: ensureCsrfToken(request)
      });
    }

    const processedForm = processFeatures({ ...formData });
    updateCaravan(parseInt(id, 10), mapFormToCaravanData(processedForm));

    if (formData.images_to_delete) {
      const imagesToDelete = Array.isArray(formData.images_to_delete)
        ? formData.images_to_delete
        : [formData.images_to_delete];

      for (const imageId of imagesToDelete) {
        if (imageId) {
          images.delete(parseInt(imageId, 10), true);
        }
      }
    }

    applyImageOrder(parseInt(id, 10), formData.image_order);
    await handleImageUploads(parseInt(id, 10), uploadedFiles, request.log);

    return reply.redirect(`/admin/edit/${id}`);
  } catch (error) {
    request.log.error({ err: error }, 'Failed to update caravan');
    const { id } = request.params;
    const caravan = getCaravanById(id);

    if (!caravan) {
      return reply.code(500).send({ message: 'Error loading caravan' });
    }

    return reply.view('pages/admin/edit', {
      title: buildEditTitle(caravan),
      caravan,
      isNew: false,
      error: `${UPDATE_ERROR_PREFIX}: ${error.message}`,
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
    request.log.error({ err: error }, 'Failed to delist caravan');
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
    request.log.error({ err: error }, 'Failed to relist caravan');
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
    request.log.error({ err: error }, 'Failed to delete caravan');
    return reply.code(500).send({ error: 'Failed to delete caravan' });
  }
};

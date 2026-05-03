import { caravans, images } from '../../db/db.js';
import { ensureCsrfToken } from '../middleware/auth.js';
import { parseMultipartForm, handleImageUploads } from './upload-service.js';
import { rejectInvalidCsrf, requireAdminSession, redirectByAdminSession } from './route-helpers.js';

const processFeatures = (data) => {
  const features = {};
  const reservedFeatureKeys = new Set([
    'air_conditioning',
    'awning',
    'bike_rack',
    'mosquito_nets',
    'tv_mount',
    'bed_types'
  ]);
  const featureMap = {
    features_air_conditioning: 'air_conditioning',
    features_awning: 'awning',
    features_bike_rack: 'bike_rack',
    features_mosquito_nets: 'mosquito_nets',
    features_tv_mount: 'tv_mount'
  };

  const bedTypeMap = {
    bed_type_bunk: 'bunk',
    bed_type_twin: 'twin',
    bed_type_dinette: 'dinette',
    bed_type_double: 'double'
  };

  for (const [key, featureName] of Object.entries(featureMap)) {
    if (data[key]) {
      features[featureName] = 1;
    }
    delete data[key];
  }

  if (data.bed_types_json) {
    try {
      const bedTypes = JSON.parse(data.bed_types_json);
      if (Array.isArray(bedTypes) && bedTypes.length > 0) {
        features.bed_types = JSON.stringify(bedTypes);
      }
    } catch {
      // Ignore invalid JSON payload and fallback to legacy checkboxes.
    }
    delete data.bed_types_json;
  } else {
    const bedTypes = [];
    for (const [formKey, bedValue] of Object.entries(bedTypeMap)) {
      if (data[formKey]) {
        bedTypes.push(bedValue);
      }
      delete data[formKey];
    }
    if (bedTypes.length > 0) {
      features.bed_types = JSON.stringify(bedTypes);
    }
  }

  for (const formKey of Object.keys(bedTypeMap)) {
    delete data[formKey];
  }

  const customFeaturesPayload = typeof data.custom_features_json === 'string'
    ? data.custom_features_json
    : (typeof data.custom_features === 'string' ? data.custom_features : '');
  delete data.custom_features_json;
  delete data.custom_features;

  let parsedCustomFeatures = [];
  if (customFeaturesPayload) {
    try {
      const parsed = JSON.parse(customFeaturesPayload);
      parsedCustomFeatures = Array.isArray(parsed) ? parsed : [];
    } catch {
      parsedCustomFeatures = [];
    }
  }

  if (parsedCustomFeatures.length === 0 && typeof customFeaturesPayload === 'string' && customFeaturesPayload.includes('\n')) {
    for (const line of customFeaturesPayload.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const separatorIndex = trimmed.indexOf('=') >= 0 ? trimmed.indexOf('=') : trimmed.indexOf(':');
      let key = trimmed;
      let value = '1';

      if (separatorIndex >= 0) {
        key = trimmed.slice(0, separatorIndex).trim();
        value = trimmed.slice(separatorIndex + 1).trim();
      }

      parsedCustomFeatures.push({ key, value });
    }
  }

  for (const entry of parsedCustomFeatures) {
    if (!entry || typeof entry !== 'object') continue;

    const key = typeof entry.key === 'string' ? entry.key.trim() : '';
    const value = entry.value === undefined || entry.value === null || entry.value === '' ? '1' : String(entry.value);

    if (!key || reservedFeatureKeys.has(key)) {
      continue;
    }

    features[key] = value;
  }

  data.features = Object.keys(features).length > 0 ? features : {};
  return data;
};

const mapFormToCaravanData = (formData) => {
  const normalizeMultiSelect = (value, allowedValues) => {
    const values = Array.isArray(value) ? value : (value ? [value] : []);
    return values
      .map((entry) => String(entry).trim())
      .filter((entry) => allowedValues.includes(entry));
  };

  const fridgeTypes = normalizeMultiSelect(formData.fridge_type, ['electric', 'gas']);
  const heatingTypes = normalizeMultiSelect(formData.heating_type, ['diesel', 'gas', 'electric']);
  const kitchenAppliances = normalizeMultiSelect(formData.kitchen_appliances, ['microwave', 'oven']);

  return {
    title: formData.title,
    slug: formData.slug,
    description: formData.description || '',
    year: formData.year ? parseInt(formData.year) : null,
    price: parseInt(formData.price),
    status: formData.status || 'available',
    featured: formData.featured ? 1 : 0,
    beds_count: formData.beds_count ? parseInt(formData.beds_count) : null,
    shower_type: formData.shower_type || null,
    has_toilet: formData.has_toilet ? 1 : 0,
    toilet_type: formData.has_toilet ? 'present' : null,
    windows_count: formData.windows_count ? parseInt(formData.windows_count) : null,
    door_position: formData.door_position || null,
    manufacturer_country: formData.manufacturer_country || null,
    fresh_water_tank_l: formData.fresh_water_tank_l ? parseInt(formData.fresh_water_tank_l) : null,
    grey_water_tank_l: formData.grey_water_tank_l ? parseInt(formData.grey_water_tank_l) : null,
    has_hot_water: formData.has_hot_water ? 1 : 0,
    water_heater_type: formData.water_heater_type || null,
    boiler_volume_l: formData.boiler_volume_l ? parseInt(formData.boiler_volume_l) : null,
    fridge_type: fridgeTypes.length > 0 ? JSON.stringify(fridgeTypes) : null,
    fridge_volume_l: formData.fridge_volume_l ? parseInt(formData.fridge_volume_l) : null,
    sink_present: formData.sink_present ? 1 : 0,
    cooktop_type: null,
    stove_burners_count: formData.stove_burners_count ? parseInt(formData.stove_burners_count) : null,
    has_microwave: kitchenAppliances.includes('microwave') ? 1 : 0,
    has_oven: kitchenAppliances.includes('oven') ? 1 : 0,
    heating_type: heatingTypes.length > 0 ? JSON.stringify(heatingTypes) : null,
    heating_distribution: formData.heating_distribution || null,
    heater_brand: formData.heater_brand || null,
    has_ac: formData.has_ac ? 1 : 0,
    vent_fans_count: formData.vent_fans_count ? parseInt(formData.vent_fans_count) : null,
    skylights_count: formData.skylights_count ? parseInt(formData.skylights_count) : null,
    camper_season: formData.camper_season || 'summer',
    double_glazed_windows: formData.double_glazed_windows ? 1 : 0,
    battery_type: formData.battery_type || null,
    battery_capacity_ah: formData.battery_capacity_ah ? parseInt(formData.battery_capacity_ah) : null,
    solar_wattage: formData.solar_wattage ? parseInt(formData.solar_wattage) : null,
    inverter_wattage: formData.inverter_wattage ? parseInt(formData.inverter_wattage) : null,
    has_12v_system: formData.has_12v_system ? 1 : 0,
    length_mm: formData.length_mm ? parseInt(formData.length_mm) : null,
    width_mm: formData.width_mm ? parseInt(formData.width_mm) : null,
    height_mm: formData.height_mm ? parseInt(formData.height_mm) : null,
    interior_height_mm: formData.interior_height_mm ? parseInt(formData.interior_height_mm) : null,
    curb_weight_kg: formData.curb_weight_kg ? parseInt(formData.curb_weight_kg) : null,
    gross_weight_kg: formData.gross_weight_kg ? parseInt(formData.gross_weight_kg) : null,
    axles_count: formData.axles_count ? parseInt(formData.axles_count) : null,
    brake_type: formData.brake_type || null,
    suspension_type: formData.suspension_type || null,
    wheel_size_inch: formData.wheel_size_inch ? parseInt(formData.wheel_size_inch) : null,
    hitch_weight_kg: null,
    braked: formData.braked ? 1 : 0,
    stabilizer_present: formData.stabilizer_present ? 1 : 0,
    condition: formData.condition || null,
    last_service_date: formData.last_service_date || null,
    features: formData.features || {}
  };
};

const renderEditPage = async (request, reply, title, caravan, isNew, error) => reply.view('pages/admin/edit', {
  title,
  caravan,
  isNew,
  error,
  csrfToken: ensureCsrfToken(request)
});

const applyImageOrder = (caravanId, imageOrder) => {
  if (!imageOrder) return;

  const requestedIds = String(imageOrder)
    .split(',')
    .map((value) => parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (requestedIds.length === 0) return;

  const validImageIds = new Set(images.getByCaravanId(caravanId).map((image) => image.id));

  requestedIds.forEach((imageId, index) => {
    if (validImageIds.has(imageId)) {
      images.reorder(imageId, index);
    }
  });
};

export default async function registerAdminPageRoutes(fastify, options = {}) {
  const { rootDir } = options;

  fastify.get('/', async (request, reply) => {
    return redirectByAdminSession(request, reply);
  });

  fastify.get('/admin', async (request, reply) => {
    return redirectByAdminSession(request, reply);
  });

  fastify.get('/admin/dash', async (request, reply) => {
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
  });

  fastify.get('/admin/edit/:id', async (request, reply) => {
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
  });

  fastify.get('/admin/new', async (request, reply) => {
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
  });

  fastify.post('/admin/new', async (request, reply) => {
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
      const newCaravan = caravans.create(mapFormToCaravanData(processedForm));

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
  });

  fastify.post('/admin/edit/:id', async (request, reply) => {
    if (!requireAdminSession(request, reply)) {
      return;
    }
    try {
      const { id } = request.params;
      const caravan = caravans.getById(parseInt(id));

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

      caravans.update(parseInt(id), mapFormToCaravanData(processedForm));

      if (formData.images_to_delete) {
        const imagesToDelete = Array.isArray(formData.images_to_delete)
          ? formData.images_to_delete
          : [formData.images_to_delete];

        for (const imageId of imagesToDelete) {
          if (imageId) {
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
  });

  fastify.post('/admin/edit/:id/delist', async (request, reply) => {
    if (!requireAdminSession(request, reply)) {
      return;
    }

    if (rejectInvalidCsrf(request, reply)) {
      return reply.code(403).send({ message: 'Invalid CSRF token' });
    }

    try {
      const { id } = request.params;
      const caravan = caravans.getById(parseInt(id, 10));

      if (!caravan) {
        return reply.code(404).send({ message: 'Caravan not found' });
      }

      caravans.update(parseInt(id, 10), {
        status: 'hidden',
        featured: 0
      });

      return reply.redirect(`/admin/edit/${id}`);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: `Error delisting caravan: ${error.message}` });
    }
  });

  fastify.post('/admin/edit/:id/relist', async (request, reply) => {
    if (!requireAdminSession(request, reply)) {
      return;
    }

    if (rejectInvalidCsrf(request, reply)) {
      return reply.code(403).send({ message: 'Invalid CSRF token' });
    }

    try {
      const { id } = request.params;
      const caravan = caravans.getById(parseInt(id, 10));

      if (!caravan) {
        return reply.code(404).send({ message: 'Caravan not found' });
      }

      caravans.update(parseInt(id, 10), {
        status: 'available'
      });

      return reply.redirect(`/admin/edit/${id}`);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: `Error relisting caravan: ${error.message}` });
    }
  });

  fastify.post('/admin/delete/:id', async (request, reply) => {
    if (!requireAdminSession(request, reply)) {
      return;
    }

    if (rejectInvalidCsrf(request, reply)) {
      return reply.send({ message: 'Invalid CSRF token' });
    }

    try {
      const { id } = request.params;
      const caravan = caravans.getById(parseInt(id));

      if (!caravan) {
        return reply.code(404).send({ message: 'Caravan not found' });
      }

      const caravanImages = images.getByCaravanId(parseInt(id));
      caravanImages.forEach((img) => {
        images.delete(img.id, true);
      });

      caravans.delete(parseInt(id));

      return reply.redirect('/admin/dash');
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: `Error deleting caravan: ${error.message}` });
    }
  });
}

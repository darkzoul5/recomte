import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, closeDb, caravans, images } from './db/db.js';
import { createServer, registerCommonPlugins } from './src/server/setup.js';
import adminRoutes from './src/routes/admin.js';
import { verifyAdminPassword, setAdminSession, clearAdminSession } from './src/middleware/auth.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = createServer();

const processFeatures = (data) => {
  const features = [];
  const featureMap = {
    features_air_conditioning: 'air_conditioning',
    features_awning: 'awning',
    features_bike_rack: 'bike_rack',
    features_mosquito_nets: 'mosquito_nets',
    features_tv_mount: 'tv_mount',
    features_storage_compartments: 'storage_compartments'
  };

  for (const [key, featureName] of Object.entries(featureMap)) {
    if (data[key]) {
      features.push(featureName);
    }
    delete data[key];
  }

  if (features.length > 0) {
    data.features = features;
  }

  return data;
};

const mapFormToCaravanData = (formData) => ({
  title: formData.title,
  slug: formData.slug,
  description: formData.description || '',
  year: formData.year ? parseInt(formData.year) : null,
  price: parseInt(formData.price),
  status: formData.status || 'available',
  featured: formData.featured ? 1 : 0,
  beds_count: formData.beds_count ? parseInt(formData.beds_count) : null,
  shower_type: formData.shower_type || null,
  toilet_type: formData.toilet_type || null,
  bed_layout: formData.bed_layout || null,
  windows_count: formData.windows_count ? parseInt(formData.windows_count) : null,
  door_position: formData.door_position || null,
  fresh_water_tank_l: formData.fresh_water_tank_l ? parseInt(formData.fresh_water_tank_l) : null,
  grey_water_tank_l: formData.grey_water_tank_l ? parseInt(formData.grey_water_tank_l) : null,
  has_hot_water: formData.has_hot_water ? 1 : 0,
  water_heater_type: formData.water_heater_type || null,
  boiler_volume_l: formData.boiler_volume_l ? parseInt(formData.boiler_volume_l) : null,
  fridge_type: formData.fridge_type || null,
  fridge_volume_l: formData.fridge_volume_l ? parseInt(formData.fridge_volume_l) : null,
  sink_present: formData.sink_present ? 1 : 0,
  cooktop_type: formData.cooktop_type || null,
  stove_burners_count: formData.stove_burners_count ? parseInt(formData.stove_burners_count) : null,
  heating_type: formData.heating_type || null,
  heating_source: formData.heating_source || null,
  has_ac: formData.has_ac ? 1 : 0,
  vent_fans_count: formData.vent_fans_count ? parseInt(formData.vent_fans_count) : null,
  skylights_count: formData.skylights_count ? parseInt(formData.skylights_count) : null,
  has_insulation: formData.has_insulation ? 1 : 0,
  double_glazed_windows: formData.double_glazed_windows ? 1 : 0,
  winter_rated: formData.winter_rated ? 1 : 0,
  battery_type: formData.battery_type || null,
  battery_capacity_ah: formData.battery_capacity_ah ? parseInt(formData.battery_capacity_ah) : null,
  solar_wattage: formData.solar_wattage ? parseInt(formData.solar_wattage) : null,
  inverter_wattage: formData.inverter_wattage ? parseInt(formData.inverter_wattage) : null,
  has_shore_power: formData.has_shore_power ? 1 : 0,
  has_12v_system: formData.has_12v_system ? 1 : 0,
  gas_system_present: formData.gas_system_present ? 1 : 0,
  gas_bottles_count: formData.gas_bottles_count ? parseInt(formData.gas_bottles_count) : null,
  length_mm: formData.length_mm ? parseInt(formData.length_mm) : null,
  width_mm: formData.width_mm ? parseInt(formData.width_mm) : null,
  height_mm: formData.height_mm ? parseInt(formData.height_mm) : null,
  interior_height_mm: formData.interior_height_mm ? parseInt(formData.interior_height_mm) : null,
  weight_empty_kg: formData.weight_empty_kg ? parseInt(formData.weight_empty_kg) : null,
  max_weight_kg: formData.max_weight_kg ? parseInt(formData.max_weight_kg) : null,
  axles_count: formData.axles_count ? parseInt(formData.axles_count) : null,
  brake_type: formData.brake_type || null,
  suspension_type: formData.suspension_type || null,
  wheel_size_inch: formData.wheel_size_inch ? parseInt(formData.wheel_size_inch) : null,
  hitch_weight_kg: formData.hitch_weight_kg ? parseInt(formData.hitch_weight_kg) : null,
  braked: formData.braked ? 1 : 0,
  stabilizer_present: formData.stabilizer_present ? 1 : 0,
  recommended_tow_vehicle_min_kg: formData.recommended_tow_vehicle_min_kg ? parseInt(formData.recommended_tow_vehicle_min_kg) : null,
  license_requirement: formData.license_requirement || null,
  condition: formData.condition || null,
  damp_detected: formData.damp_detected ? 1 : 0,
  last_service_date: formData.last_service_date || null,
  ownership_count: formData.ownership_count ? parseInt(formData.ownership_count) : null,
  features: formData.features ? JSON.stringify(Array.isArray(formData.features) ? formData.features : [formData.features]) : '[]'
});

const parseMultipartForm = async (request) => {
  const formData = {};
  const uploadedFiles = [];

  const parts = request.parts();
  for await (const part of parts) {
    if (part.type === 'field') {
      if (part.fieldname === 'features' && formData[part.fieldname]) {
        if (Array.isArray(formData[part.fieldname])) {
          formData[part.fieldname].push(part.value);
        } else {
          formData[part.fieldname] = [formData[part.fieldname], part.value];
        }
      } else {
        formData[part.fieldname] = part.value;
      }
    } else if (part.type === 'file') {
      if (part.fieldname === 'images') {
        const buffer = await part.toBuffer();
        if (buffer && buffer.length > 0) {
          uploadedFiles.push({
            filename: part.filename,
            buffer,
            mimetype: part.mimetype
          });
        }
      } else {
        await part.toBuffer();
      }
    }
  }

  return { formData, uploadedFiles };
};

const handleImageUploads = (caravanId, uploadedFiles) => {
  if (uploadedFiles.length === 0) {
    return;
  }

  const imagesDir = path.join(__dirname, 'public', 'images', 'caravans', String(caravanId));
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  for (const fileData of uploadedFiles) {
    try {
      if (!fileData.buffer || fileData.buffer.length === 0) {
        continue;
      }

      const ext = path.extname(fileData.filename);
      const baseName = path.basename(fileData.filename, ext);
      const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
      const fileName = `caravan-${caravanId}-${sanitized}-${Date.now()}${ext}`;
      const filePath = path.join(imagesDir, fileName);

      fs.writeFileSync(filePath, fileData.buffer);

      const imageUrl = `/public/images/caravans/${caravanId}/${fileName}`;
      images.create(caravanId, imageUrl, fileData.filename, 0);
    } catch (error) {
      fastify.log.error(`Image upload failed for file ${fileData.filename}: ${error.message}`);
    }
  }
};

const renderEditPage = async (request, reply, title, caravan, isNew, error) => reply.view('admin/edit', {
  title,
  caravan,
  isNew,
  error
});

(async () => {
  try {
    initDb();

    await registerCommonPlugins(fastify, { rootDir: __dirname });

    fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

    await fastify.register(adminRoutes);

    fastify.get('/', async (request, reply) => {
      if (request.session.adminId) {
        return reply.redirect('/admin/dash');
      }
      return reply.redirect('/admin/login');
    });

    fastify.get('/admin', async (request, reply) => {
      if (request.session.adminId) {
        return reply.redirect('/admin/dash');
      }
      return reply.redirect('/admin/login');
    });

    fastify.get('/admin/login', async (request, reply) => {
      if (request.session.adminId) {
        return reply.redirect('/admin/dash');
      }
      return reply.view('admin/login', { title: 'Админ Вход', error: null });
    });

    fastify.post('/admin/login', async (request, reply) => {
      const { password } = request.body;

      if (!password) {
        return reply.view('admin/login', { title: 'Админ Вход', error: 'Пароль требуется' });
      }

      try {
        if (verifyAdminPassword(password)) {
          setAdminSession(request, 'admin');
          return reply.redirect('/admin/dash');
        }

        return reply.view('admin/login', { title: 'Админ Вход', error: 'Неверный пароль' });
      } catch (error) {
        fastify.log.error(error);
        return reply.view('admin/login', { title: 'Админ Вход', error: 'Ошибка сервера' });
      }
    });

    fastify.post('/admin/logout', async (request, reply) => {
      clearAdminSession(request);
      return reply.redirect('/admin/login');
    });

    fastify.get('/admin/dash', async (request, reply) => {
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
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
        return reply.view('admin/dashboard', {
          title: 'Панель управления',
          caravans: data.caravans || []
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.view('admin/dashboard', { title: 'Панель управления', caravans: [] });
      }
    });

    fastify.get('/admin/edit/:id', async (request, reply) => {
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
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
        return reply.view('admin/edit', {
          title: `Редактировать: ${caravan.title}`,
          caravan,
          isNew: false,
          error: null
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: 'Error loading caravan' });
      }
    });

    fastify.get('/admin/new', async (request, reply) => {
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
      }

      return renderEditPage(request, reply, 'Добавить новый кемпер', {
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
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
      }

      try {
        const { formData, uploadedFiles } = await parseMultipartForm(request);

        if (!formData.title || !formData.slug || !formData.price) {
          return renderEditPage(request, reply, 'Добавить новый кемпер', {
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

        handleImageUploads(newCaravan.id, uploadedFiles);

        return reply.redirect('/admin/dash');
      } catch (error) {
        fastify.log.error(error);
        return renderEditPage(request, reply, 'Добавить новый кемпер', {
          title: '',
          slug: '',
          price: 0,
          status: 'available',
          featured: 0,
          images: []
        }, true, 'Ошибка при создании кемпера: ' + error.message);
      }
    });

    fastify.post('/admin/edit/:id', async (request, reply) => {
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
      }

      try {
        const { id } = request.params;
        const caravan = caravans.getById(parseInt(id));

        if (!caravan) {
          return reply.code(404).send({ message: 'Caravan not found' });
        }

        const { formData, uploadedFiles } = await parseMultipartForm(request);
        const processedForm = processFeatures({ ...formData });

        const updatedCaravan = caravans.update(parseInt(id), mapFormToCaravanData(processedForm));

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

        handleImageUploads(parseInt(id), uploadedFiles);

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

        return reply.view('admin/edit', {
          title: `Редактировать: ${caravan.title}`,
          caravan,
          isNew: false,
          error: 'Ошибка при обновлении кемпера: ' + error.message
        });
      }
    });

    fastify.post('/admin/delete/:id', async (request, reply) => {
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
      }

      try {
        const { id } = request.params;
        const caravan = caravans.getById(parseInt(id));

        if (!caravan) {
          return reply.code(404).send({ message: 'Caravan not found' });
        }

        const caravanImages = images.getByCaravanId(parseInt(id));
        caravanImages.forEach(img => {
          images.delete(img.id, true);
        });

        caravans.delete(parseInt(id));

        return reply.redirect('/admin/dash');
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ message: 'Error deleting caravan: ' + error.message });
      }
    });

    const closeGracefully = async (signal) => {
      fastify.log.info(`Received ${signal}, closing gracefully`);
      closeDb();
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));

    const host = process.env.ADMIN_HOST || '0.0.0.0';
    const port = parseInt(process.env.ADMIN_PORT || '3001', 10);

    await fastify.listen({ host, port });
    fastify.log.info(`🔒 Admin server running at http://${host}:${port}`);
  } catch (error) {
    console.error('Failed to start admin server:', error);
    process.exit(1);
  }
})();
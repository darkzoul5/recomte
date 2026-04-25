import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { initDb, closeDb, caravans, images } from './db/db.js';
import { createServer, registerCommonPlugins } from './src/server/setup.js';
import adminRoutes from './src/routes/admin.js';
import {
  verifyAdminCredentials,
  setAdminSession,
  clearAdminSession,
  ensureInitialAdminUser
} from './src/middleware/auth.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = createServer();
let deployInProgress = false;

const triggerDeploy = () => {
  deployInProgress = true;

  const deployProcess = spawn('docker', ['compose', 'pull'], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  deployProcess.stdout.on('data', (chunk) => {
    fastify.log.info({ deploy: chunk.toString().trim() }, 'docker compose pull');
  });

  deployProcess.stderr.on('data', (chunk) => {
    fastify.log.error({ deploy: chunk.toString().trim() }, 'docker compose pull error');
  });

  deployProcess.on('close', (pullCode) => {
    if (pullCode !== 0) {
      fastify.log.error({ pullCode }, 'Deploy failed during docker compose pull');
      deployInProgress = false;
      return;
    }

    const upProcess = spawn('docker', ['compose', 'up', '-d'], {
      cwd: __dirname,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    upProcess.stdout.on('data', (chunk) => {
      fastify.log.info({ deploy: chunk.toString().trim() }, 'docker compose up');
    });

    upProcess.stderr.on('data', (chunk) => {
      fastify.log.error({ deploy: chunk.toString().trim() }, 'docker compose up error');
    });

    upProcess.on('close', (upCode) => {
      if (upCode !== 0) {
        fastify.log.error({ upCode }, 'Deploy failed during docker compose up -d');
      } else {
        fastify.log.info('Deploy completed successfully');
      }
      deployInProgress = false;
    });
  });

  deployProcess.on('error', (error) => {
    fastify.log.error(error, 'Unable to start docker compose pull process');
    deployInProgress = false;
  });
};

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

  // Handle new bed_types_json input
  if (data.bed_types_json) {
    try {
      const bedTypes = JSON.parse(data.bed_types_json);
      if (Array.isArray(bedTypes) && bedTypes.length > 0) {
        features.bed_types = JSON.stringify(bedTypes);
      }
    } catch {
      // If JSON parsing fails, ignore
    }
    delete data.bed_types_json;
  } else {
    // Fallback: check for old checkbox format for backward compatibility
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

  // Clean up old bed type checkboxes
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

  if (Object.keys(features).length > 0) {
    data.features = features;
  } else {
    data.features = {};
  }

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
  tow_vehicle_max_kg: null,
  condition: formData.condition || null,
  last_service_date: formData.last_service_date || null,
    features: formData.features || {}
  };
};

const parseMultipartForm = async (request) => {
  const formData = {};
  const uploadedFiles = [];

  const parts = request.parts();
  for await (const part of parts) {
    if (part.type === 'field') {
      if (formData[part.fieldname] !== undefined) {
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

    const bootstrapResult = await ensureInitialAdminUser();
    if (bootstrapResult.created) {
      fastify.log.warn(`Bootstrap admin user created: ${bootstrapResult.username}`);
    }

    await registerCommonPlugins(fastify, { rootDir: __dirname });

    fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

    fastify.post('/deploy', async (request, reply) => {
      const configuredSecret = process.env.WEBHOOK_SECRET;
      const providedSecretHeader = request.headers['x-webhook-secret'];
      const providedSecret = Array.isArray(providedSecretHeader)
        ? providedSecretHeader[0]
        : providedSecretHeader;

      if (!configuredSecret) {
        fastify.log.error('WEBHOOK_SECRET is not configured');
        return reply.code(503).send({ error: 'Deploy webhook is not configured' });
      }

      if (!providedSecret || providedSecret !== configuredSecret) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      if (deployInProgress) {
        return reply.code(409).send({ status: 'deploy_in_progress' });
      }

      triggerDeploy();
      return reply.send({ status: 'deploying' });
    });

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
      const { username, password } = request.body;

      if (!username || !password) {
        return reply.view('admin/login', { title: 'Админ Вход', error: 'Логин и пароль требуются' });
      }

      try {
        if (await verifyAdminCredentials(username, password)) {
          setAdminSession(request, username);
          return reply.redirect('/admin/dash');
        }

        return reply.view('admin/login', { title: 'Админ Вход', error: 'Неверный логин или пароль' });
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
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
      }

      try {
        const { formData, uploadedFiles } = await parseMultipartForm(request);

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

        handleImageUploads(newCaravan.id, uploadedFiles);

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
        }, true, 'Ошибка при создании: ' + error.message);
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
          error: 'Ошибка при обновлении: ' + error.message
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
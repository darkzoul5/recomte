import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, closeDb, caravans, images } from './db/db.js';
import { createServer, registerCommonPlugins } from './src/server/setup.js';
import adminRoutes from './src/routes/admin.js';
import {
  verifyAdminCredentials,
  setAdminSession,
  clearAdminSession,
  ensureInitialAdminUser,
  ensureCsrfToken,
  getCsrfTokenFromRequest,
  verifyCsrfToken
} from './src/middleware/auth.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = createServer();

const MINUTE_MS = 60 * 1000;
const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || `${MINUTE_MS}`, 10);
const AUTH_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '30', 10);
const LOGIN_ATTEMPT_WINDOW_MS = parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MS || `${10 * MINUTE_MS}`, 10);
const LOGIN_MAX_FAILED_ATTEMPTS = parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS || '10', 10);
const LOGIN_LOCKOUT_MS = parseInt(process.env.LOGIN_LOCKOUT_MS || `${15 * MINUTE_MS}`, 10);

const authRateLimitStore = new Map();
const loginAttemptStore = new Map();

const getClientIp = (request) => request.ip || request.headers['x-forwarded-for'] || 'unknown';

const cleanupExpiredAuthEntries = () => {
  const now = Date.now();

  for (const [key, entry] of authRateLimitStore.entries()) {
    if (entry.windowStart + AUTH_RATE_LIMIT_WINDOW_MS <= now) {
      authRateLimitStore.delete(key);
    }
  }

  for (const [key, entry] of loginAttemptStore.entries()) {
    const lockExpired = !entry.lockUntil || entry.lockUntil <= now;
    const attemptsExpired = !entry.firstAttemptAt || entry.firstAttemptAt + LOGIN_ATTEMPT_WINDOW_MS <= now;
    if (lockExpired && attemptsExpired) {
      loginAttemptStore.delete(key);
    }
  }
};

setInterval(cleanupExpiredAuthEntries, MINUTE_MS).unref();

const createAuthRateLimiter = (routeKey) => async (request, reply) => {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${routeKey}:${ip}`;

  let state = authRateLimitStore.get(key);
  if (!state || now - state.windowStart >= AUTH_RATE_LIMIT_WINDOW_MS) {
    state = {
      windowStart: now,
      count: 0
    };
  }

  state.count += 1;
  authRateLimitStore.set(key, state);

  if (state.count > AUTH_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((state.windowStart + AUTH_RATE_LIMIT_WINDOW_MS - now) / 1000);
    reply.header('Retry-After', String(Math.max(retryAfterSeconds, 1)));
    return reply.code(429).send({ error: 'Too many authentication requests. Please try again later.' });
  }
};

const getLoginAttemptState = (username, ip) => {
  const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
  const accountKey = `acct:${normalizedUsername}`;
  const ipKey = `ip:${ip}`;

  return {
    accountKey,
    ipKey,
    account: loginAttemptStore.get(accountKey) || null,
    byIp: loginAttemptStore.get(ipKey) || null
  };
};

const resetLoginAttempts = (username, ip) => {
  const { accountKey, ipKey } = getLoginAttemptState(username, ip);
  loginAttemptStore.delete(accountKey);
  loginAttemptStore.delete(ipKey);
};

const registerFailedLogin = (username, ip) => {
  const now = Date.now();
  const keys = [];

  if (typeof username === 'string' && username.trim()) {
    keys.push(`acct:${username.trim().toLowerCase()}`);
  }

  keys.push(`ip:${ip}`);

  for (const key of keys) {
    const previous = loginAttemptStore.get(key);
    let attempts = 1;
    let firstAttemptAt = now;

    if (previous && now - previous.firstAttemptAt < LOGIN_ATTEMPT_WINDOW_MS) {
      attempts = previous.attempts + 1;
      firstAttemptAt = previous.firstAttemptAt;
    }

    const lockUntil = attempts >= LOGIN_MAX_FAILED_ATTEMPTS ? now + LOGIN_LOCKOUT_MS : null;

    loginAttemptStore.set(key, {
      attempts,
      firstAttemptAt,
      lockUntil
    });
  }
};

const ensureLoginNotLocked = (request, reply, username) => {
  const now = Date.now();
  const ip = getClientIp(request);
  const { account, byIp } = getLoginAttemptState(username, ip);
  const activeLocks = [account?.lockUntil, byIp?.lockUntil]
    .filter((value) => typeof value === 'number' && value > now);

  if (activeLocks.length === 0) {
    return true;
  }

  const nearestUnlockTs = Math.min(...activeLocks);
  const retryAfterSeconds = Math.ceil((nearestUnlockTs - now) / 1000);
  reply.header('Retry-After', String(Math.max(retryAfterSeconds, 1)));
  reply.code(429);
  return reply.view('admin/login', {
    title: 'Админ Вход',
    error: 'Слишком много неудачных попыток входа. Повторите позже.',
    csrfToken: ensureCsrfToken(request)
  });
};

const authRouteRateLimit = createAuthRateLimiter('admin-auth');

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

const renderLoginPage = (request, reply, error = null) => reply.view('admin/login', {
  title: 'Админ Вход',
  error,
  csrfToken: ensureCsrfToken(request)
});

const renderEditPage = async (request, reply, title, caravan, isNew, error) => reply.view('admin/edit', {
  title,
  caravan,
  isNew,
  error,
  csrfToken: ensureCsrfToken(request)
});

const rejectInvalidCsrf = (request, reply, bodyOverride = null) => {
  const candidateToken = getCsrfTokenFromRequest(request, bodyOverride);
  if (verifyCsrfToken(request, candidateToken)) {
    return false;
  }

  reply.code(403);
  return true;
};

const regenerateSession = (request) => new Promise((resolve, reject) => {
  if (!request.session || typeof request.session.regenerate !== 'function') {
    resolve();
    return;
  }

  request.session.regenerate((error) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
});

const destroySession = (request) => new Promise((resolve, reject) => {
  if (!request.session || typeof request.session.destroy !== 'function') {
    clearAdminSession(request);
    resolve();
    return;
  }

  request.session.destroy((error) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
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

    fastify.get('/admin/login', { onRequest: [authRouteRateLimit] }, async (request, reply) => {
      if (request.session.adminId) {
        return reply.redirect('/admin/dash');
      }
      return renderLoginPage(request, reply, null);
    });

    fastify.post('/admin/login', { onRequest: [authRouteRateLimit] }, async (request, reply) => {
      const { username, password } = request.body;

      if (rejectInvalidCsrf(request, reply)) {
        return renderLoginPage(request, reply, 'Недействительный токен безопасности. Обновите страницу и попробуйте снова.');
      }

      const lockResult = ensureLoginNotLocked(request, reply, username);
      if (lockResult !== true) {
        return lockResult;
      }

      if (!username || !password) {
        return renderLoginPage(request, reply, 'Логин и пароль требуются');
      }

      try {
        if (await verifyAdminCredentials(username, password)) {
          resetLoginAttempts(username, getClientIp(request));
          await regenerateSession(request);
          setAdminSession(request, username);
          return reply.redirect('/admin/dash');
        }

        registerFailedLogin(username, getClientIp(request));

        return renderLoginPage(request, reply, 'Неверный логин или пароль');
      } catch (error) {
        fastify.log.error(error);
        registerFailedLogin(username, getClientIp(request));
        return renderLoginPage(request, reply, 'Ошибка сервера');
      }
    });

    fastify.post('/admin/logout', { onRequest: [authRouteRateLimit] }, async (request, reply) => {
      if (rejectInvalidCsrf(request, reply)) {
        return reply.send({ error: 'Invalid CSRF token' });
      }

      await destroySession(request);
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
          caravans: data.caravans || [],
          csrfToken: ensureCsrfToken(request)
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.view('admin/dashboard', {
          title: 'Панель управления',
          caravans: [],
          csrfToken: ensureCsrfToken(request)
        });
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
          error: null,
          csrfToken: ensureCsrfToken(request)
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

      if (rejectInvalidCsrf(request, reply, { _csrf: request.query?._csrf })) {
        return renderEditPage(request, reply, 'Добавить', {
          title: '',
          slug: '',
          price: 0,
          status: 'available',
          featured: 0,
          images: []
        }, true, 'Недействительный токен безопасности. Обновите страницу и попробуйте снова.');
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

      if (rejectInvalidCsrf(request, reply, { _csrf: request.query?._csrf })) {
        return reply.code(403).send({ message: 'Invalid CSRF token' });
      }

      try {
        const { id } = request.params;
        const caravan = caravans.getById(parseInt(id));

        if (!caravan) {
          return reply.code(404).send({ message: 'Caravan not found' });
        }

        const { formData, uploadedFiles } = await parseMultipartForm(request);

        if (rejectInvalidCsrf(request, reply, formData)) {
          return reply.view('admin/edit', {
            title: `Редактировать: ${caravan.title}`,
            caravan,
            isNew: false,
            error: 'Недействительный токен безопасности. Обновите страницу и попробуйте снова.',
            csrfToken: ensureCsrfToken(request)
          });
        }

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
          error: 'Ошибка при обновлении: ' + error.message,
          csrfToken: ensureCsrfToken(request)
        });
      }
    });

    fastify.post('/admin/delete/:id', async (request, reply) => {
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
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
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/db.js';
import { createServer, registerCommonPlugins } from './src/server/setup.js';
import publicPagesRoutes from './src/routes/public-pages.js';
import caravansRoutes from './src/routes/caravans.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = createServer();

(async () => {
  try {
    initDb();

    await registerCommonPlugins(fastify, { rootDir: __dirname });

    fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

    await fastify.register(caravansRoutes);
    await fastify.register(publicPagesRoutes);

    fastify.get('*', async (request, reply) => {
      return reply.code(404).view('404');
    });

    fastify.post('*', async (request, reply) => {
      return reply.code(404).view('404');
    });

    const closeGracefully = async (signal) => {
      fastify.log.info(`Received ${signal}, closing gracefully`);
      closeDb();
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));

    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3000', 10);

    await fastify.listen({ host, port });
    fastify.log.info(`🚀 Public server running at http://${host}:${port}`);
  } catch (error) {
    console.error('Failed to start public server:', error);
    process.exit(1);
  }
})();import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/db.js';
import { createServer, registerCommonPlugins } from './src/server/setup.js';
import publicPagesRoutes from './src/routes/public-pages.js';
import caravansRoutes from './src/routes/caravans.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = createServer();

(async () => {
  try {
    initDb();

    await registerCommonPlugins(fastify, { rootDir: __dirname });

    fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

    await fastify.register(caravansRoutes);
    await fastify.register(publicPagesRoutes);

    fastify.get('*', async (request, reply) => {
      return reply.code(404).view('404');
    });

    fastify.post('*', async (request, reply) => {
      return reply.code(404).view('404');
    });

    const closeGracefully = async (signal) => {
      fastify.log.info(`Received ${signal}, closing gracefully`);
      closeDb();
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));

    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3000', 10);

    await fastify.listen({ host, port });
    fastify.log.info(`🚀 Public server running at http://${host}:${port}`);
  } catch (error) {
    console.error('Failed to start public server:', error);
    process.exit(1);
  }
})();import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/db.js';
import { createServer, registerCommonPlugins } from './src/server/setup.js';
import publicPagesRoutes from './src/routes/public-pages.js';
import caravansRoutes from './src/routes/caravans.js';

dotenv.config({ override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = createServer();

(async () => {
  try {
    initDb();

    await registerCommonPlugins(fastify, { rootDir: __dirname });

    fastify.get('/healthcheck', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

    await fastify.register(caravansRoutes);
    await fastify.register(publicPagesRoutes);

    const closeGracefully = async (signal) => {
      fastify.log.info(`Received ${signal}, closing gracefully`);
      closeDb();
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));

    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3000', 10);

    await fastify.listen({ host, port });
    fastify.log.info(`🚀 Public server running at http://${host}:${port}`);
  } catch (error) {
    console.error('Failed to start public server:', error);
    process.exit(1);
  }
})();import dotenv from 'dotenv';
        path: '/'
      }
    });

    const cspHeader = [
      "default-src 'self'",
      "img-src 'self' https: data:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' https:",
      "font-src 'self' https: data:",
      "frame-src 'self' https://www.openstreetmap.org https://*.openstreetmap.org",
      "child-src 'self' https://www.openstreetmap.org https://*.openstreetmap.org",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'"
    ].join('; ');

    const permissionsPolicyHeader = [
      'geolocation=()',
      'camera=()',
      'microphone=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'fullscreen=(self)'
    ].join(', ');

    fastify.addHook('onRequest', async (request, reply) => {
      const forwardedProto = request.headers['x-forwarded-proto'];
      const protocol = Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : (forwardedProto || '').split(',')[0].trim();

      if (protocol && protocol !== 'https') {
        return reply.redirect(301, `https://${request.headers.host}${request.raw.url}`);
      }
    });

    fastify.addHook('onSend', async (request, reply, payload) => {
      reply.removeHeader('server');
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'SAMEORIGIN');
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      reply.header('X-Robots-Tag', 'noindex, nofollow');
      reply.header('Content-Security-Policy', cspHeader);
      reply.header('Permissions-Policy', permissionsPolicyHeader);
      return payload;
    });

    // Serve static files from public directory
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, 'public'),
      prefix: '/public/'
    });

    // Register EJS template engine
    const fastifyView = (await import('@fastify/view')).default;
    await fastify.register(fastifyView, {
      engine: {
        ejs: (await import('ejs')).default
      },
      root: path.join(__dirname, 'views')
    });

    // Health check endpoint (excluded from logging)
    fastify.get('/healthcheck', { logLevel: 'silent' }, async (request, reply) => {
      return { status: 'ok' };
    });

    // ===== PAGE ROUTES (Server-Rendered) =====

    // Homepage
    fastify.get('/', async (request, reply) => {
      try {
        const response = await fastify.inject({
          method: 'GET',
          url: '/api/featured-caravans'
        });
        const data = JSON.parse(response.body);
        return reply.view('home', { title: 'Главная', caravans: data.caravans || [] });
      } catch (err) {
        fastify.log.error(err);
        return reply.view('home', { title: 'Главная', caravans: [] });
      }
    });

// Caravan catalogue
fastify.get('/caravans', async (request, reply) => {
  try {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/caravans'
    });
    const data = JSON.parse(response.body);
    return reply.view('catalogue', { title: 'Каталог', caravans: data.caravans || [] });
  } catch (err) {
    fastify.log.error(err);
    return reply.view('catalogue', { title: 'Каталог', caravans: [] });
  }
});

// Single caravan detail
fastify.get('/caravans/:slug', async (request, reply) => {
  try {
    const response = await fastify.inject({
      method: 'GET',
      url: `/api/caravans/${request.params.slug}`
    });
    
    if (response.statusCode === 404) {
      return reply.code(404).send({ message: 'Caravan not found' });
    }
    
    const caravan = JSON.parse(response.body);
    return reply.view('caravan', { title: caravan.title, caravan });
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ message: 'Error loading caravan' });
  }
});

// Contact page
    fastify.get('/contact', async (request, reply) => {
      return reply.view('contact', { title: 'Контакты' });
    });

    // ===== ADMIN PAGES =====

    // Admin root - redirect to login or dashboard
    fastify.get('/admin', async (request, reply) => {
      if (request.session.adminId) {
        return reply.redirect('/admin/dash');
      }
      return reply.redirect('/admin/login');
    });

    // Admin login page
    fastify.get('/admin/login', async (request, reply) => {
      // Redirect if already logged in
      if (request.session.adminId) {
        return reply.redirect('/admin/dash');
      }
      return reply.view('admin/login', { title: 'Админ Вход', error: null });
    });

    // Admin login form handler
    fastify.post('/admin/login', async (request, reply) => {
      const { username, password } = request.body;

      if (!username || !password) {
        fastify.log.info('Login request with invalid credentials');
        return reply.view('admin/login', { title: 'Админ Вход', error: 'Логин и пароль требуются' });
      }

      try {
        const { verifyAdminCredentials, setAdminSession } = await import('./src/middleware/auth.js');
        
        if (await verifyAdminCredentials(username, password)) {
          fastify.log.info('Login successful, setting session');
          setAdminSession(request, username);
          fastify.log.info('Session after login:', { adminId: request.session.adminId, sessionID: request.sessionID });
          return reply.redirect('/admin/dash');
        } else {
          fastify.log.info('Login request with invalid credentials');
          return reply.view('admin/login', { title: 'Админ Вход', error: 'Неверный логин или пароль' });
        }
      } catch (err) {
        fastify.log.error(err);
        return reply.view('admin/login', { title: 'Админ Вход', error: 'Ошибка сервера' });
      }
    });

    // Admin logout
    fastify.post('/admin/logout', async (request, reply) => {
      const { clearAdminSession } = await import('./src/middleware/auth.js');
      clearAdminSession(request);
      return reply.redirect('/admin/login');
    });

    // Admin dashboard (protected)
    fastify.get('/admin/dash', async (request, reply) => {
      fastify.log.debug('GET /admin/dash - checking session', { sessionId: request.sessionID, adminId: request.session?.adminId });
      console.log('Current session in /admin/dash:', JSON.stringify(request.session));
      console.log('Session ID:', request.sessionID);
      console.log('Cookies received:', request.headers.cookie);
      
      if (!request.session.adminId) {
        fastify.log.warn('Admin session not found, redirecting to login');
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
      } catch (err) {
        fastify.log.error(err);
        return reply.view('admin/dashboard', { title: 'Панель управления', caravans: [] });
      }
    });

    // Admin edit caravan page (protected)
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
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ message: 'Error loading caravan' });
      }
    });

    // Admin new caravan page (protected)
    fastify.get('/admin/new', async (request, reply) => {
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
      }

      const emptyCaravan = {
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
      };

      return reply.view('admin/edit', { 
        title: 'Добавить новый кемпер', 
        caravan: emptyCaravan,
        isNew: true,
        error: null
      });
    });

    // POST /admin/new - create new caravan from form with file uploads
    fastify.post('/admin/new', async (request, reply) => {
      if (!request.session.adminId) {
        return reply.redirect('/admin/login');
      }

      try {
        const formData = {};
        const uploadedFiles = [];

        // Parse multipart form data
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'field') {
            // Handle form fields
            if (part.fieldname === 'features' && formData[part.fieldname]) {
              // Handle multiple feature checkboxes
              if (Array.isArray(formData[part.fieldname])) {
                formData[part.fieldname].push(part.value);
              } else {
                formData[part.fieldname] = [formData[part.fieldname], part.value];
              }
            } else {
              formData[part.fieldname] = part.value;
            }
          } else if (part.type === 'file') {
            // Only save files with fieldname 'images'
            if (part.fieldname === 'images') {
              // Convert stream to buffer immediately
              const buffer = await part.toBuffer();
              uploadedFiles.push({
                filename: part.filename,
                buffer: buffer,
                mimetype: part.mimetype
              });
            } else {
              // Consume the stream even if we don't save it
              await part.toBuffer();
            }
          }
        }

        if (!formData.title || !formData.slug || !formData.price) {
          const emptyCaravan = { title: '', slug: '', price: 0, status: 'available', featured: 0, images: [] };
          return reply.view('admin/edit', { 
            title: 'Добавить новый кемпер', 
            caravan: emptyCaravan,
            isNew: true,
            error: 'Заполните обязательные поля: название, slug и цена'
          });
        }

        // Create caravan
        const newCaravan = caravans.create({
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

        // Handle uploaded images
        if (uploadedFiles.length > 0) {
          const imagesDir = path.join(__dirname, 'public', 'images', 'caravans', String(newCaravan.id));
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
          }

          for (const fileData of uploadedFiles) {
            try {
              // Skip empty files
              if (!fileData.buffer || fileData.buffer.length === 0) {
                fastify.log.warn(`Skipping empty file: ${fileData.filename}`);
                continue;
              }

              // Generate unique filename with caravan ID, sanitizing the original filename
              const ext = path.extname(fileData.filename);
              const baseName = path.basename(fileData.filename, ext);
              // Sanitize: replace spaces and special chars with hyphens, keep only alphanumeric, hyphens, underscores
              const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
              const fileName = `caravan-${newCaravan.id}-${sanitized}-${Date.now()}${ext}`;
              const filePath = path.join(imagesDir, fileName);

              // Write file buffer to disk
              fs.writeFileSync(filePath, fileData.buffer);

              // Store image URL in database
              const imageUrl = `/public/images/caravans/${newCaravan.id}/${fileName}`;
              images.create(newCaravan.id, imageUrl, fileData.filename, 0);
            } catch (fileErr) {
              fastify.log.error(`Image upload failed for file ${fileData.filename}: ${fileErr.message}`);
            }
          }
        }

        return reply.redirect(`/admin/dash`);
      } catch (err) {
        fastify.log.error(err);
        const emptyCaravan = { title: '', slug: '', price: 0, status: 'available', featured: 0, images: [] };
        return reply.view('admin/edit', { 
          title: 'Добавить новый кемпер', 
          caravan: emptyCaravan,
          isNew: true,
          error: 'Ошибка при создании кемпера: ' + err.message
        });
      }
    });

    // POST /admin/edit/:id - update caravan from form with file uploads
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

        const formData = {};
        const uploadedFiles = [];

        // Parse multipart form data
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'field') {
            // Handle multiple values with same fieldname (e.g., images_to_delete)
            if (part.fieldname === 'images_to_delete') {
              if (formData[part.fieldname]) {
                // Convert to array or push to existing array
                if (Array.isArray(formData[part.fieldname])) {
                  formData[part.fieldname].push(part.value);
                } else {
                  formData[part.fieldname] = [formData[part.fieldname], part.value];
                }
              } else {
                formData[part.fieldname] = part.value;
              }
            } else {
              formData[part.fieldname] = part.value;
            }
          } else if (part.type === 'file') {
            // Only save files with fieldname 'images'
            if (part.fieldname === 'images') {
              fastify.log.info(`File received: ${part.filename}, encoding: ${part.encoding}, mimetype: ${part.mimetype}`);
              // Convert stream to buffer immediately
              const buffer = await part.toBuffer();
              fastify.log.info(`Buffer size for ${part.filename}: ${buffer.length} bytes`);
              if (buffer && buffer.length > 0) {
                uploadedFiles.push({
                  filename: part.filename,
                  buffer: buffer,
                  mimetype: part.mimetype
                });
              } else {
                fastify.log.warn(`Skipped empty file: ${part.filename}`);
              }
            } else {
              // Consume the stream even if we don't save it
              await part.toBuffer();
            }
          }
        }
        fastify.log.info(`Total files to upload: ${uploadedFiles.length}`);

        const updatedCaravan = caravans.update(parseInt(id), {
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

        // Handle image deletions (marked for deletion in form)
        if (formData.images_to_delete) {
          const imagesToDelete = Array.isArray(formData.images_to_delete) 
            ? formData.images_to_delete 
            : [formData.images_to_delete];
          
          for (const imageId of imagesToDelete) {
            if (imageId) {
              fastify.log.info(`Deleting image ${imageId} from disk and database...`);
              images.delete(parseInt(imageId), true); // true = delete file from disk
            }
          }
        }

        // Handle image reorder from drag-and-drop UI
        if (typeof formData.image_order === 'string' && formData.image_order.trim()) {
          const caravanId = parseInt(id);
          const requestedOrder = formData.image_order
            .split(',')
            .map((value) => parseInt(value, 10))
            .filter((value) => Number.isInteger(value) && value > 0);

          const currentImages = images.getByCaravanId(caravanId);
          const existingIds = new Set(currentImages.map((img) => img.id));
          const usedIds = new Set();
          let sortOrder = 0;

          for (const imageId of requestedOrder) {
            if (!existingIds.has(imageId) || usedIds.has(imageId)) continue;
            images.reorder(imageId, sortOrder++);
            usedIds.add(imageId);
          }

          for (const image of currentImages) {
            if (usedIds.has(image.id)) continue;
            images.reorder(image.id, sortOrder++);
          }
        }

        // Handle uploaded images
        if (uploadedFiles.length > 0) {
          fastify.log.info(`Processing ${uploadedFiles.length} uploaded files...`);
          const imagesDir = path.join(__dirname, 'public', 'images', 'caravans', String(id));
          if (!fs.existsSync(imagesDir)) {
            fastify.log.info(`Creating directory: ${imagesDir}`);
            fs.mkdirSync(imagesDir, { recursive: true });
          }

          let nextSortOrder = images.getByCaravanId(parseInt(id)).length;

          for (const fileData of uploadedFiles) {
            try {
              // Skip empty files
              if (!fileData.buffer || fileData.buffer.length === 0) {
                fastify.log.warn(`Skipping empty file: ${fileData.filename}`);
                continue;
              }

              // Generate unique filename with caravan ID, sanitizing the original filename
              const ext = path.extname(fileData.filename);
              const baseName = path.basename(fileData.filename, ext);
              // Sanitize: replace spaces and special chars with hyphens, keep only alphanumeric, hyphens, underscores
              const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
              const fileName = `caravan-${id}-${sanitized}-${Date.now()}${ext}`;
              const filePath = path.join(imagesDir, fileName);

              fastify.log.info(`Writing file to: ${filePath}`);
              // Write file buffer to disk synchronously
              fs.writeFileSync(filePath, fileData.buffer);
              fastify.log.info(`File written successfully: ${fileName}`);

              // Store image URL in database
              const imageUrl = `/public/images/caravans/${id}/${fileName}`;
              images.create(parseInt(id), imageUrl, fileData.filename, nextSortOrder);
              nextSortOrder += 1;
              fastify.log.info(`Image record created in database for: ${imageUrl}`);
            } catch (fileErr) {
              fastify.log.error(`Image upload failed for file ${fileData.filename}: ${fileErr.message}`);
            }
          }
        } else {
          fastify.log.info(`No files to upload (uploadedFiles.length = ${uploadedFiles.length})`);
        }

        return reply.redirect(`/admin/edit/${id}`);
      } catch (err) {
        fastify.log.error(err);
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
          error: 'Ошибка при обновлении кемпера: ' + err.message
        });
      }
    });

    // POST /admin/delete/:id - delete caravan
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

        // Delete associated images
        const caravanImages = images.getByCaravanId(parseInt(id));
        caravanImages.forEach(img => {
          images.delete(img.id, true); // true = delete file from disk
        });

        // Delete caravan
        caravans.delete(parseInt(id));

        return reply.redirect('/admin/dash');
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ message: 'Error deleting caravan: ' + err.message });
      }
    });

    // Register API routes
    await fastify.register(caravansRoutes);
    await fastify.register(adminRoutes);

    // Global 404 handler - must be registered last
    fastify.get('*', async (request, reply) => {
      return reply.code(404).view('404');
    });

    fastify.post('*', async (request, reply) => {
      return reply.code(404).view('404');
    });

// Graceful shutdown
const closeGracefully = async (signal) => {
  fastify.log.info(`Received ${signal}, closing gracefully`);
  closeDb();
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

// Start server
    const start = async () => {
      try {
        const host = process.env.HOST || '0.0.0.0';
        const port = parseInt(process.env.PORT || 3000);

        await fastify.listen({ host, port });
        fastify.log.info(`🚀 Server running at http://${host}:${port}`);
      } catch (err) {
        fastify.log.error(err);
        process.exit(1);
      }
    };

    await start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

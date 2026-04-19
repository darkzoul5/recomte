import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/db.js';
import caravansRoutes from './src/routes/caravans.js';
import adminRoutes from './src/routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development'
});

// Initialize database
initDb();

// Register plugins
await fastify.register(fastifyCookie);

await fastify.register(fastifySession, {
  secret: process.env.SESSION_SECRET || 'default_secret_change_in_production',
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  }
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

// Health check
fastify.get('/health', async (request, reply) => {
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
    const caravans = JSON.parse(response.body);
    return reply.view('home', { title: 'Главная', caravans });
  } catch (err) {
    fastify.log.error(err);
    return reply.view('home', { title: 'Главная', caravans: [] });
  }
});

// Caravan catalogue
fastify.get('/vehicles', async (request, reply) => {
  try {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/caravans'
    });
    const caravans = JSON.parse(response.body);
    return reply.view('catalogue', { title: 'Каталог', caravans });
  } catch (err) {
    fastify.log.error(err);
    return reply.view('catalogue', { title: 'Каталог', caravans: [] });
  }
});

// Single caravan detail
fastify.get('/vehicles/:slug', async (request, reply) => {
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

// Admin login page
fastify.get('/admin/login', async (request, reply) => {
  const error = request.query.error ? decodeURIComponent(request.query.error) : null;
  return reply.view('admin/login', { title: 'Admin Login', error });
});

// Admin login handler
fastify.post('/admin/login', async (request, reply) => {
  const { password } = request.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  
  if (password === adminPassword) {
    request.session.admin = true;
    return reply.redirect('/admin');
  }
  
  return reply.redirect('/admin/login?error=' + encodeURIComponent('Неправильный пароль'));
});

// Admin dashboard (protected)
fastify.get('/admin', async (request, reply) => {
  if (!request.session.admin) {
    return reply.redirect('/admin/login');
  }
  
  try {
    const response = await fastify.inject({
      method: 'GET',
      url: '/admin/api/caravans',
      cookies: request.cookies
    });
    const caravans = JSON.parse(response.body);
    return reply.view('admin/dashboard', { title: 'Admin Dashboard', caravans });
  } catch (err) {
    fastify.log.error(err);
    return reply.view('admin/dashboard', { title: 'Admin Dashboard', caravans: [] });
  }
});

// Admin new/edit form
fastify.get('/admin/new', async (request, reply) => {
  if (!request.session.admin) {
    return reply.redirect('/admin/login');
  }
  return reply.view('admin/edit', { title: 'Новый кемпер' });
});

// Admin create caravan (form submission)
fastify.post('/admin/new', async (request, reply) => {
  if (!request.session.admin) {
    return reply.redirect('/admin/login');
  }
  
  try {
    const fields = request.body;
    
    // Prepare caravan data
    const caravanData = {
      title: fields.title,
      slug: fields.slug,
      description: fields.description || null,
      price: parseInt(fields.price),
      year: fields.year ? parseInt(fields.year) : null,
      status: fields.status || 'available',
      featured: fields.featured ? 1 : 0,
      winter_rated: fields.winter_rated ? 1 : 0,
      beds_count: fields.beds_count ? parseInt(fields.beds_count) : null,
      has_shower: fields.has_shower ? 1 : 0,
      has_toilet: fields.has_toilet ? 1 : 0,
      toilet_type: fields.toilet_type || null,
      fresh_water_tank_l: fields.fresh_water_tank_l ? parseInt(fields.fresh_water_tank_l) : null,
      grey_water_tank_l: fields.grey_water_tank_l ? parseInt(fields.grey_water_tank_l) : null,
      black_water_tank_l: fields.black_water_tank_l ? parseInt(fields.black_water_tank_l) : null,
      fridge_type: fields.fridge_type || null,
      fridge_volume_l: fields.fridge_volume_l ? parseInt(fields.fridge_volume_l) : null,
      has_cooktop: fields.has_cooktop ? 1 : 0,
      has_oven: fields.has_oven ? 1 : 0,
      heating_type: fields.heating_type || null,
      heating_brand: fields.heating_brand || null,
      heating_source: fields.heating_source || null,
      has_hot_water: fields.has_hot_water ? 1 : 0,
      hot_water_type: fields.hot_water_type || null,
      battery_type: fields.battery_type || null,
      battery_capacity_ah: fields.battery_capacity_ah ? parseInt(fields.battery_capacity_ah) : null,
      inverter_watts: fields.inverter_watts ? parseInt(fields.inverter_watts) : null,
      has_solar_panels: fields.has_solar_panels ? 1 : 0,
      solar_panels_watts: fields.solar_panels_watts ? parseInt(fields.solar_panels_watts) : null,
      length_mm: fields.length_mm ? parseInt(fields.length_mm) : null,
      width_mm: fields.width_mm ? parseInt(fields.width_mm) : null,
      height_mm: fields.height_mm ? parseInt(fields.height_mm) : null,
      weight_empty_kg: fields.weight_empty_kg ? parseInt(fields.weight_empty_kg) : null,
      weight_max_kg: fields.weight_max_kg ? parseInt(fields.weight_max_kg) : null
    };
    
    // Call API to create caravan
    const apiResponse = await fastify.inject({
      method: 'POST',
      url: '/admin/api/caravans',
      payload: caravanData,
      cookies: request.cookies
    });
    
    if (apiResponse.statusCode !== 200) {
      return reply.view('admin/edit', { 
        title: 'Новый кемпер',
        error: 'Ошибка при создании кемпера'
      });
    }
    
    return reply.redirect('/admin');
  } catch (error) {
    fastify.log.error(error);
    return reply.view('admin/edit', { 
      title: 'Новый кемпер',
      error: error.message
    });
  }
});

fastify.get('/admin/edit/:id', async (request, reply) => {
  if (!request.session.admin) {
    return reply.redirect('/admin/login');
  }
  
  try {
    const response = await fastify.inject({
      method: 'GET',
      url: `/admin/api/caravans/${request.params.id}`,
      cookies: request.cookies
    });
    
    if (response.statusCode === 404) {
      return reply.code(404).send({ message: 'Caravan not found' });
    }
    
    const caravan = JSON.parse(response.body);
    return reply.view('admin/edit', { title: 'Редактировать: ' + caravan.title, caravan });
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ message: 'Error loading caravan' });
  }
});

// Admin update caravan (form submission)
fastify.post('/admin/edit/:id', async (request, reply) => {
  if (!request.session.admin) {
    return reply.redirect('/admin/login');
  }
  
  try {
    const carvanId = parseInt(request.params.id);
    const fields = request.body;
    
    // Prepare caravan data
    const caravanData = {
      title: fields.title,
      slug: fields.slug,
      description: fields.description || null,
      price: parseInt(fields.price),
      year: fields.year ? parseInt(fields.year) : null,
      status: fields.status || 'available',
      featured: fields.featured ? 1 : 0,
      winter_rated: fields.winter_rated ? 1 : 0,
      beds_count: fields.beds_count ? parseInt(fields.beds_count) : null,
      has_shower: fields.has_shower ? 1 : 0,
      has_toilet: fields.has_toilet ? 1 : 0,
      toilet_type: fields.toilet_type || null,
      fresh_water_tank_l: fields.fresh_water_tank_l ? parseInt(fields.fresh_water_tank_l) : null,
      grey_water_tank_l: fields.grey_water_tank_l ? parseInt(fields.grey_water_tank_l) : null,
      black_water_tank_l: fields.black_water_tank_l ? parseInt(fields.black_water_tank_l) : null,
      fridge_type: fields.fridge_type || null,
      fridge_volume_l: fields.fridge_volume_l ? parseInt(fields.fridge_volume_l) : null,
      has_cooktop: fields.has_cooktop ? 1 : 0,
      has_oven: fields.has_oven ? 1 : 0,
      heating_type: fields.heating_type || null,
      heating_brand: fields.heating_brand || null,
      heating_source: fields.heating_source || null,
      has_hot_water: fields.has_hot_water ? 1 : 0,
      hot_water_type: fields.hot_water_type || null,
      battery_type: fields.battery_type || null,
      battery_capacity_ah: fields.battery_capacity_ah ? parseInt(fields.battery_capacity_ah) : null,
      inverter_watts: fields.inverter_watts ? parseInt(fields.inverter_watts) : null,
      has_solar_panels: fields.has_solar_panels ? 1 : 0,
      solar_panels_watts: fields.solar_panels_watts ? parseInt(fields.solar_panels_watts) : null,
      length_mm: fields.length_mm ? parseInt(fields.length_mm) : null,
      width_mm: fields.width_mm ? parseInt(fields.width_mm) : null,
      height_mm: fields.height_mm ? parseInt(fields.height_mm) : null,
      weight_empty_kg: fields.weight_empty_kg ? parseInt(fields.weight_empty_kg) : null,
      weight_max_kg: fields.weight_max_kg ? parseInt(fields.weight_max_kg) : null
    };
    
    // Call API to update caravan
    const apiResponse = await fastify.inject({
      method: 'PUT',
      url: `/admin/api/caravans/${carvanId}`,
      payload: caravanData,
      cookies: request.cookies
    });
    
    if (apiResponse.statusCode !== 200) {
      return reply.view('admin/edit', { 
        title: 'Редактировать',
        error: 'Ошибка при обновлении кемпера'
      });
    }
    
    return reply.redirect('/admin');
  } catch (error) {
    fastify.log.error(error);
    return reply.view('admin/edit', { 
      title: 'Редактировать',
      error: error.message
    });
  }
});

// Admin delete caravan (via form button)
fastify.post('/admin/delete/:id', async (request, reply) => {
  if (!request.session.admin) {
    return reply.redirect('/admin/login');
  }
  
  try {
    const apiResponse = await fastify.inject({
      method: 'DELETE',
      url: `/admin/api/caravans/${request.params.id}`,
      cookies: request.cookies
    });
    
    return reply.redirect('/admin');
  } catch (error) {
    fastify.log.error(error);
    return reply.redirect('/admin?error=' + encodeURIComponent('Failed to delete caravan'));
  }
});

// Admin logout
fastify.post('/admin/logout', async (request, reply) => {
  request.session.admin = null;
  return reply.redirect('/admin/login');
});

// Register API routes
await fastify.register(caravansRoutes);
await fastify.register(adminRoutes);

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

start();

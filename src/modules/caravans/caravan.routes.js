import { listCaravans, getCaravan, getFeaturedCatalog } from './caravan.controller.js';

export default async function registerCaravansRoutes(fastify) {
  // GET /api/caravans - list caravans for catalogue
  fastify.get('/api/caravans', listCaravans);

  // GET /api/caravans/:slug - get single caravan by slug
  fastify.get('/api/caravans/:slug', getCaravan);

  // GET /api/featured-caravans - get featured caravans for homepage
  fastify.get('/api/featured-caravans', getFeaturedCatalog);
}

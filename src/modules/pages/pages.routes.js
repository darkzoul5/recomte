import { getHomePage, getCatalogPage, getCaravanPage, getContactPage } from './pages.controller.js';

export default async function registerPagesRoutes(fastify) {
  fastify.get('/', getHomePage);
  fastify.get('/caravans', getCatalogPage);
  fastify.get('/caravans/:slug', getCaravanPage);
  fastify.get('/contact', getContactPage);
}

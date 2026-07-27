import { getHomePage, getCatalogPage, getCaravanPage, getContactPage, getPrivacyPage } from './pages.controller.ts';

export default async function registerPagesRoutes(fastify) {
  fastify.get('/', getHomePage);
  fastify.get('/caravans', getCatalogPage);
  fastify.get('/caravans/:slug', getCaravanPage);
  fastify.get('/contact', getContactPage);
  fastify.get('/privacy', getPrivacyPage);
}

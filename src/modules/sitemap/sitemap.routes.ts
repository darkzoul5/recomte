import { getRobots, getSitemap, getSitemapIndex } from './sitemap.controller.ts';

export default async function registerSitemapRoutes(fastify) {
  fastify.get('/robots.txt', getRobots);
  fastify.get('/sitemap.xml', getSitemap);
  fastify.get('/sitemap-index.xml', getSitemapIndex);
}

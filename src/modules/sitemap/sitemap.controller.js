import { getRobotsContent, generateSitemap, generateSitemapIndex } from './sitemap.service.js';

export const getRobots = async (request, reply) => {
  try {
    const robotsContent = getRobotsContent();
    reply.type('text/plain; charset=utf-8');
    reply.header('Cache-Control', 'public, max-age=604800'); // 7 days
    return reply.send(robotsContent);
  } catch (error) {
    request.log.error({ err: error }, 'Robots.txt error');
    return reply.code(404).send('Not Found');
  }
};

export const getSitemap = async (request, reply) => {
  try {
    const baseUrl = `${request.protocol}://${request.hostname}`;
    const xmlContent = generateSitemap(baseUrl);

    reply.type('application/xml');
    reply.header('Cache-Control', 'public, max-age=86400'); // 24 hours
    return reply.send(xmlContent);
  } catch (error) {
    request.log.error({ err: error }, 'Sitemap generation error');
    return reply.code(500).send({ error: 'Failed to generate sitemap' });
  }
};

export const getSitemapIndex = async (request, reply) => {
  try {
    const baseUrl = `${request.protocol}://${request.hostname}`;
    const xmlContent = generateSitemapIndex(baseUrl);

    reply.type('application/xml');
    reply.header('Cache-Control', 'public, max-age=86400');
    return reply.send(xmlContent);
  } catch (error) {
    request.log.error({ err: error }, 'Sitemap index generation error');
    return reply.code(500).send({ error: 'Failed to generate sitemap index' });
  }
};

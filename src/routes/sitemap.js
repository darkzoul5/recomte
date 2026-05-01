import { caravans } from '../../db/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function sitemapRoutes(fastify) {
  /**
   * GET /robots.txt - Static robots.txt file
   * Serves from public/robots.txt
   */
  fastify.get('/robots.txt', async (request, reply) => {
    try {
      const robotsPath = path.join(__dirname, '../../public/robots.txt');
      const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
      reply.type('text/plain; charset=utf-8');
      reply.header('Cache-Control', 'public, max-age=604800'); // 7 days
      return reply.send(robotsContent);
    } catch (error) {
      fastify.log.error('Robots.txt error:', error);
      return reply.code(404).send('Not Found');
    }
  });

  /**
   * GET /sitemap.xml - Dynamic XML sitemap
   * Includes static pages and all active caravans
   */
  fastify.get('/sitemap.xml', async (request, reply) => {
    try {
      const baseUrl = `${request.protocol}://${request.hostname}`;
      
      // Get all active caravans (not hidden)
      const allCaravans = caravans.getAll();
      const activeCaravans = allCaravans.filter((caravan) => caravan.status !== 'hidden');

      // Build the sitemap XML
      let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmlContent += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
      xmlContent += 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

      // Static pages
      const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'weekly' },
        { url: '/caravans', priority: '0.9', changefreq: 'daily' },
        { url: '/contact', priority: '0.7', changefreq: 'monthly' }
      ];

      const now = new Date().toISOString().split('T')[0];

      // Add static pages
      for (const page of staticPages) {
        xmlContent += '  <url>\n';
        xmlContent += `    <loc>${baseUrl}${page.url}</loc>\n`;
        xmlContent += `    <lastmod>${now}</lastmod>\n`;
        xmlContent += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xmlContent += `    <priority>${page.priority}</priority>\n`;
        xmlContent += '  </url>\n';
      }

      // Add caravan pages
      for (const caravan of activeCaravans) {
        const caravanUrl = `/caravans/${caravan.slug}`;
        
        xmlContent += '  <url>\n';
        xmlContent += `    <loc>${baseUrl}${caravanUrl}</loc>\n`;
        
        // Use updated_at if available, otherwise use current date
        const lastmod = caravan.updated_at
          ? new Date(caravan.updated_at).toISOString().split('T')[0]
          : now;
        xmlContent += `    <lastmod>${lastmod}</lastmod>\n`;
        xmlContent += '    <changefreq>weekly</changefreq>\n';
        xmlContent += '    <priority>0.8</priority>\n';
        
        // Include primary image if available
        if (caravan.primary_image_url) {
          xmlContent += '    <image:image>\n';
          xmlContent += `      <image:loc>${baseUrl}${caravan.primary_image_url}</image:loc>\n`;
          xmlContent += `      <image:title>${escapeXml(caravan.title)}</image:title>\n`;
          xmlContent += '    </image:image>\n';
        }
        
        xmlContent += '  </url>\n';
      }

      xmlContent += '</urlset>';

      // Set proper content type and caching headers
      reply.type('application/xml');
      reply.header('Cache-Control', 'public, max-age=86400'); // 24 hours
      return reply.send(xmlContent);
    } catch (error) {
      fastify.log.error('Sitemap generation error:', error);
      return reply.code(500).send({ error: 'Failed to generate sitemap' });
    }
  });

  /**
   * GET /sitemap-index.xml - Sitemap index (for future multi-file sitemaps)
   * Can be extended if sitemap grows beyond 50,000 URLs
   */
  fastify.get('/sitemap-index.xml', async (request, reply) => {
    try {
      const baseUrl = `${request.protocol}://${request.hostname}`;
      const now = new Date().toISOString().split('T')[0];

      let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmlContent += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      xmlContent += '  <sitemap>\n';
      xmlContent += `    <loc>${baseUrl}/sitemap.xml</loc>\n`;
      xmlContent += `    <lastmod>${now}</lastmod>\n`;
      xmlContent += '  </sitemap>\n';
      xmlContent += '</sitemapindex>';

      reply.type('application/xml');
      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.send(xmlContent);
    } catch (error) {
      fastify.log.error('Sitemap index generation error:', error);
      return reply.code(500).send({ error: 'Failed to generate sitemap index' });
    }
  });
}

/**
 * Escape special XML characters
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

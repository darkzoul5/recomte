import { caravans } from '../../../db/db.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSiteUrl } from '../../utils/site-url.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const getRobotsContent = () => {
  const robotsPath = path.join(__dirname, '../../../public/robots.txt');
  return fs.readFileSync(robotsPath, 'utf-8').replace('__SITE_URL__', getSiteUrl());
};

export const generateSitemap = (baseUrl) => {
  const allCaravans = caravans.getAll();
  const activeCaravans = allCaravans.filter((caravan) => caravan.status !== 'hidden');

  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xmlContent += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
  xmlContent += 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/caravans', priority: '0.9', changefreq: 'daily' },
    { url: '/contact', priority: '0.7', changefreq: 'monthly' }
  ];

  const now = new Date().toISOString().split('T')[0];

  for (const page of staticPages) {
    xmlContent += '  <url>\n';
    xmlContent += `    <loc>${baseUrl}${page.url}</loc>\n`;
    xmlContent += `    <lastmod>${now}</lastmod>\n`;
    xmlContent += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xmlContent += `    <priority>${page.priority}</priority>\n`;
    xmlContent += '  </url>\n';
  }

  for (const caravan of activeCaravans) {
    const caravanUrl = `/caravans/${caravan.slug}`;
    
    xmlContent += '  <url>\n';
    xmlContent += `    <loc>${baseUrl}${caravanUrl}</loc>\n`;
    
    const lastmod = caravan.updated_at
      ? new Date(caravan.updated_at).toISOString().split('T')[0]
      : now;
    xmlContent += `    <lastmod>${lastmod}</lastmod>\n`;
    xmlContent += '    <changefreq>weekly</changefreq>\n';
    xmlContent += '    <priority>0.8</priority>\n';
    
    if (caravan.primary_image_url) {
      xmlContent += '    <image:image>\n';
      xmlContent += `      <image:loc>${baseUrl}${caravan.primary_image_url}</image:loc>\n`;
      xmlContent += `      <image:title>${escapeXml(caravan.title)}</image:title>\n`;
      xmlContent += '    </image:image>\n';
    }
    
    xmlContent += '  </url>\n';
  }

  xmlContent += '</urlset>';

  return xmlContent;
};

export const generateSitemapIndex = (baseUrl) => {
  const now = new Date().toISOString().split('T')[0];

  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xmlContent += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xmlContent += '  <sitemap>\n';
  xmlContent += `    <loc>${baseUrl}/sitemap.xml</loc>\n`;
  xmlContent += `    <lastmod>${now}</lastmod>\n`;
  xmlContent += '  </sitemap>\n';
  xmlContent += '</sitemapindex>';

  return xmlContent;
};

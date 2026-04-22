/**
 * Sitemap Engine - Cinema.online Complete Rebuild
 * 
 * Feature #1: Dynamic Sitemap Generation for SEO
 * Generates XML sitemaps split by content type for Google indexing
 */

import express from 'express';
import pool from '../../src/db/pool.js';

const router = express.Router();

const SITE_URL = 'https://4cima.com';

/**
 * Helper: Generate XML sitemap
 */
function generateSitemapXML(urls) {
  const urlEntries = urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq || 'weekly'}</changefreq>
    <priority>${url.priority || '0.8'}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

/**
 * GET /sitemap.xml - Main sitemap index
 */
router.get('/sitemap.xml', (req, res) => {
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-movies.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-tv.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-actors.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-static.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
</sitemapindex>`;

  res.header('Content-Type', 'application/xml');
  res.send(sitemapIndex);
});

/**
 * GET /sitemap-movies.xml - Movies sitemap
 */
router.get('/sitemap-movies.xml', async (req, res) => {
  try {
    const query = `
      SELECT slug, updated_at
      FROM movies
      WHERE slug IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 50000
    `;

    const result = await pool.query(query);

    const urls = result.rows.map(row => ({
      loc: `${SITE_URL}/movie/${row.slug}`,
      lastmod: new Date(row.updated_at).toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    }));

    const xml = generateSitemapXML(urls);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Sitemap] Error generating movies sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * GET /sitemap-tv.xml - TV series sitemap
 */
router.get('/sitemap-tv.xml', async (req, res) => {
  try {
    const query = `
      SELECT slug, updated_at
      FROM tv_series
      WHERE slug IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 50000
    `;

    const result = await pool.query(query);

    const urls = result.rows.map(row => ({
      loc: `${SITE_URL}/tv/${row.slug}`,
      lastmod: new Date(row.updated_at).toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    }));

    const xml = generateSitemapXML(urls);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Sitemap] Error generating TV sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * GET /sitemap-actors.xml - Actors sitemap
 */
router.get('/sitemap-actors.xml', async (req, res) => {
  try {
    const query = `
      SELECT slug, updated_at
      FROM actors
      WHERE slug IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 50000
    `;

    const result = await pool.query(query);

    const urls = result.rows.map(row => ({
      loc: `${SITE_URL}/actor/${row.slug}`,
      lastmod: new Date(row.updated_at).toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.6'
    }));

    const xml = generateSitemapXML(urls);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Sitemap] Error generating actors sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * GET /sitemap-static.xml - Static pages sitemap
 */
router.get('/sitemap-static.xml', (req, res) => {
  const staticPages = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${SITE_URL}/movies`, priority: '0.9', changefreq: 'daily' },
    { loc: `${SITE_URL}/tv`, priority: '0.9', changefreq: 'daily' },
    { loc: `${SITE_URL}/actors`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${SITE_URL}/search`, priority: '0.8', changefreq: 'weekly' }
  ];

  const urls = staticPages.map(page => ({
    ...page,
    lastmod: new Date().toISOString().split('T')[0]
  }));

  const xml = generateSitemapXML(urls);
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

export default router;

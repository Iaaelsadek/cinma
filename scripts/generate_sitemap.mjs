
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('🚀 Generating sitemap.xml from CockroachDB...');
    
    const baseUrl = 'https://cinma.online';
    const staticPages = [
      '',
      '/movies',
      '/series',
      '/plays',
      '/kids',
      '/software',
      '/quran',
      '/ramadan'
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page}</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Fetch movies with slugs
    const movies = await client.query('SELECT slug, created_at FROM movies WHERE slug IS NOT NULL');
    for (const row of movies.rows) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/movie/${row.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(row.created_at || Date.now()).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Fetch tv_series with slugs
    const series = await client.query('SELECT slug, created_at FROM tv_series WHERE slug IS NOT NULL');
    for (const row of series.rows) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/series/${row.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(row.created_at || Date.now()).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Fetch games with slugs
    const games = await client.query('SELECT slug, created_at FROM games WHERE slug IS NOT NULL');
    for (const row of games.rows) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/game/${row.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(row.created_at || Date.now()).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Fetch software with slugs
    const software = await client.query('SELECT slug, created_at FROM software WHERE slug IS NOT NULL');
    for (const row of software.rows) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/software/${row.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(row.created_at || Date.now()).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += '</urlset>';

    const outputPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(outputPath, xml);
    console.log(`✅ Sitemap generated successfully at ${outputPath}`);
    console.log(`📊 Total URLs: ${staticPages.length + movies.rows.length + series.rows.length + games.rows.length + software.rows.length}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);

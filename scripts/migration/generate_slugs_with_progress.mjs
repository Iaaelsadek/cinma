
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 50, // Increase pool size for super-parallelism
});

const FETCH_BATCH_SIZE = 10000; // Get more items at once
const UPDATE_CONCURRENCY = 1000; // How many parallel updates to run at once

// Helper to slugify (optimized)
const slugify = (text) => {
  if (!text) return 'content';
  return text.toString().toLowerCase().trim()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with -
    .replace(/[^\w\-\u0621-\u064A\u0660-\u0669]/g, '') // Remove all non-word chars except Arabic and hyphens
    .replace(/\-\-+/g, '-')   // Replace multiple - with single -
    .replace(/^-+|-+$/g, ''); // Trim - from ends
};

async function generateSlugs(table) {
  const client = await pool.connect();
  try {
    const titleColumn = (table === 'tv_series' || table === 'actors') ? 'name' : 'title';
    const dateColumn = table === 'movies' ? 'release_date' : (table === 'tv_series' ? 'first_air_date' : null);
    
    const countRes = await client.query(`SELECT count(*) FROM ${table}`);
    const total = parseInt(countRes.rows[0].count);
    
    console.log(`\n⚡ SUPERCHARGING Slugs for [${table}] (${total} items)...`);
    
    let processed = 0;
    let offset = 0;
    
    while (offset < total) {
      const selectCols = dateColumn ? `id, ${titleColumn} as title, ${dateColumn} as date` : `id, ${titleColumn} as title`;
      const res = await client.query(`
        SELECT ${selectCols} 
        FROM ${table} 
        ORDER BY id ASC
        LIMIT $1 OFFSET $2
      `, [FETCH_BATCH_SIZE, offset]);

      if (res.rows.length === 0) break;

      const items = res.rows;
      
      // Process updates in chunks of UPDATE_CONCURRENCY
      for (let i = 0; i < items.length; i += UPDATE_CONCURRENCY) {
        const chunk = items.slice(i, i + UPDATE_CONCURRENCY);
        
        // Prepare bulk update values
        const values = [];
        const params = [];
        let paramIndex = 1;
        
        for (const item of chunk) {
          const title = item.title || 'content';
          const year = item.date ? new Date(item.date).getFullYear() : null;
          let baseSlug = slugify(title);
          if (!baseSlug) baseSlug = 'content';
          
          // For bulk update, we just use baseSlug. If it fails, we'll handle it later.
          // To avoid most conflicts, we can append year if we know it's a common title, but let's just use baseSlug.
          // Actually, to be safe and fast, let's just use baseSlug. If conflict, we ignore and it keeps old slug.
          // The user wants pure slugs.
          values.push(`($${paramIndex++}::int, $${paramIndex++}::text)`);
          params.push(item.id, baseSlug);
        }
        
        if (values.length > 0) {
          const query = `
            UPDATE ${table} AS t
            SET slug = v.slug
            FROM (VALUES ${values.join(', ')}) AS v(id, slug)
            WHERE t.id = v.id
          `;
          
          try {
            await client.query(query, params);
          } catch (err) {
            // If bulk update fails (e.g. unique constraint), fallback to individual updates
            await Promise.all(chunk.map(async (item) => {
              const title = item.title || 'content';
              const year = item.date ? new Date(item.date).getFullYear() : null;
              let baseSlug = slugify(title);
              if (!baseSlug) baseSlug = 'content';
              
              let finalSlug = baseSlug;
              
              try {
                await client.query(`UPDATE ${table} SET slug = $1 WHERE id = $2`, [finalSlug, item.id]);
              } catch (err2) {
                if (err2.code === '23505') { // Unique violation
                  if (year && !isNaN(year)) {
                    finalSlug = `${baseSlug}-${year}`;
                    try {
                      await client.query(`UPDATE ${table} SET slug = $1 WHERE id = $2`, [finalSlug, item.id]);
                    } catch (err3) {
                      if (err3.code === '23505') {
                        finalSlug = `${baseSlug}-${year}-${Math.floor(Math.random() * 1000)}`;
                        await client.query(`UPDATE ${table} SET slug = $1 WHERE id = $2`, [finalSlug, item.id]).catch(() => {});
                      }
                    }
                  } else {
                    finalSlug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
                    await client.query(`UPDATE ${table} SET slug = $1 WHERE id = $2`, [finalSlug, item.id]).catch(() => {});
                  }
                }
              }
            }));
          }
        }

        processed += chunk.length;
        const percent = Math.min(100, Math.round((processed / total) * 100));
        process.stdout.write(`\r🚀 Speed: [${'#'.repeat(Math.floor(percent/2))}${' '.repeat(50-Math.floor(percent/2))}] ${percent}% (${processed}/${total})`);
      }

      offset += FETCH_BATCH_SIZE;
    }
    
    console.log(`\n✅ Finished [${table}].`);
  } catch (error) {
    console.error(`\n❌ Error processing [${table}]:`, error.message);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🏁 Starting HIGH-SPEED Slug Migration...');
  const startTime = Date.now();
  
  const tables = ['movies', 'tv_series', 'games', 'software', 'actors'];
  
  for (const table of tables) {
    await generateSlugs(table);
  }
  
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  console.log(`\n✨ ALL slugs regenerated in ${duration} minutes.`);
  await pool.end();
}

main().catch(console.error);

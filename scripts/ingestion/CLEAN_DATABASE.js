#!/usr/bin/env node

/**
 * CLEAN DATABASE - حذف كل المحتوى
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 5
});

async function cleanDatabase() {
  console.log('🗑️  حذف كل المحتوى من قاعدة البيانات...\n');

  try {
    // Count before deletion
    const moviesBefore = await pool.query(`SELECT COUNT(*) FROM movies`);
    const tvBefore = await pool.query(`SELECT COUNT(*) FROM tv_series`);

    console.log(`📊 قبل الحذف:`);
    console.log(`   - أفلام: ${moviesBefore.rows[0].count}`);
    console.log(`   - مسلسلات: ${tvBefore.rows[0].count}\n`);

    // Delete in correct order (foreign keys) - in batches
    console.log('🗑️  جاري الحذف...');

    // Helper function to delete in batches
    async function deleteBatch(table, batchSize = 1000) {
      let deleted = 0;
      let total = 0;

      while (true) {
        const result = await pool.query(
          `DELETE FROM ${table} WHERE id IN (SELECT id FROM ${table} LIMIT $1)`,
          [batchSize]
        );

        deleted = result.rowCount;
        total += deleted;

        if (deleted === 0) break;

        process.stdout.write(`\r   🗑️  ${table}: ${total} deleted...`);
      }

      console.log(`\r   ✅ ${table}: ${total} deleted     `);
    }

    await deleteBatch('similar_movies');
    await deleteBatch('similar_tv_series');
    await deleteBatch('movie_cast');
    await deleteBatch('tv_cast');
    await deleteBatch('movie_keywords');
    await deleteBatch('tv_keywords');
    await deleteBatch('movie_spoken_languages');
    await deleteBatch('tv_spoken_languages');
    await deleteBatch('episodes');
    await deleteBatch('seasons');
    await deleteBatch('keywords');
    await deleteBatch('spoken_languages');
    await deleteBatch('actors');
    await deleteBatch('movies');
    await deleteBatch('tv_series');
    await deleteBatch('software');

    // Count after deletion
    const moviesAfter = await pool.query(`SELECT COUNT(*) FROM movies`);
    const tvAfter = await pool.query(`SELECT COUNT(*) FROM tv_series`);

    console.log(`\n📊 بعد الحذف:`);
    console.log(`   - أفلام: ${moviesAfter.rows[0].count}`);
    console.log(`   - مسلسلات: ${tvAfter.rows[0].count}`);

    console.log('\n✅ تم حذف كل المحتوى بنجاح!');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanDatabase();

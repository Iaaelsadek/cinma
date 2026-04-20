#!/usr/bin/env node

/**
 * 🗑️ Delete All Content from CockroachDB
 * Prepares database for fresh ingestion with proper translations
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ override: true });

// Hardcode to avoid dotenv parsing issues
const connectionString = process.env.COCKROACHDB_URL ||
    "postgresql://cinma-db:VnenboPw5irCagYwdirHRQ@prying-squid-23421.j77.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full";

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function deleteAllContent() {
    try {
        // Get counts before deletion
        const before = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM movies) as movies,
                (SELECT COUNT(*) FROM tv_series) as tv_series,
                (SELECT COUNT(*) FROM seasons) as seasons,
                (SELECT COUNT(*) FROM episodes) as episodes,
                (SELECT COUNT(*) FROM actors) as actors
        `);

        console.log('📊 المحتوى الحالي:');
        console.log('   أفلام:', before.rows[0].movies);
        console.log('   مسلسلات:', before.rows[0].tv_series);
        console.log('   مواسم:', before.rows[0].seasons);
        console.log('   حلقات:', before.rows[0].episodes);
        console.log('   ممثلين:', before.rows[0].actors);
        console.log('');

        // Delete all content (in correct order due to foreign keys)
        console.log('🗑️  جاري الحذف...');

        await pool.query('DELETE FROM episodes');
        console.log('   ✅ حذف الحلقات');

        await pool.query('DELETE FROM seasons');
        console.log('   ✅ حذف المواسم');

        await pool.query('DELETE FROM tv_series');
        console.log('   ✅ حذف المسلسلات');

        await pool.query('DELETE FROM movies');
        console.log('   ✅ حذف الأفلام');

        await pool.query('DELETE FROM actors');
        console.log('   ✅ حذف الممثلين');

        await pool.query('DELETE FROM anime');
        console.log('   ✅ حذف الأنمي');

        await pool.query('DELETE FROM games');
        console.log('   ✅ حذف الألعاب');

        await pool.query('DELETE FROM software');
        console.log('   ✅ حذف البرامج');

        await pool.query('DELETE FROM reviews');
        console.log('   ✅ حذف المراجعات');

        await pool.query('DELETE FROM content_moderation');
        console.log('   ✅ حذف سجل الفلترة');

        console.log('');
        console.log('✅ تم حذف كل المحتوى بنجاح!');
        console.log('🎯 جاهز لتنزيل محتوى نضيف مترجم');

        await pool.end();

    } catch (error) {
        console.error('❌ خطأ:', error.message);
        await pool.end();
        process.exit(1);
    }
}

deleteAllContent();

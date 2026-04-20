#!/usr/bin/env node
/**
 * ترجمة الأوصاف المفقودة (overview_ar)
 * يترجم المحتوى الموجود الذي ليس له وصف عربي
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { translateContent } from './services/translation-service.js';

dotenv.config();

const { Pool } = pg;
const rawUrl = (process.env.COCKROACHDB_URL || '').replace(/^["']|["']$/g, '').trim();
const pool = new Pool({ connectionString: rawUrl, ssl: { rejectUnauthorized: false } });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ══════════════════════════════════════════════
// Stats
// ══════════════════════════════════════════════
const stats = {
    movies: { total: 0, translated: 0, failed: 0 },
    series: { total: 0, translated: 0, failed: 0 },
    start: Date.now()
};

// ══════════════════════════════════════════════
// Translate Movies
// ══════════════════════════════════════════════
async function translateMovies(limit = 100) {
    console.log('\n🎬 ترجمة أوصاف الأفلام...\n');

    // جلب الأفلام بدون overview_ar
    const result = await pool.query(`
    SELECT id, title, overview
    FROM movies
    WHERE (overview_ar IS NULL OR overview_ar = '')
      AND overview IS NOT NULL
      AND overview != ''
    LIMIT $1
  `, [limit]);

    stats.movies.total = result.rows.length;
    console.log(`📊 وجدنا ${stats.movies.total} فيلم بدون وصف عربي\n`);

    for (const movie of result.rows) {
        try {
            console.log(`\n🎬 ${movie.title} (ID: ${movie.id})`);

            // ترجمة الوصف
            const translated = await translateContent({ overview_en: movie.overview });

            if (translated.overview_ar) {
                // تحديث قاعدة البيانات
                await pool.query(
                    'UPDATE movies SET overview_ar = $1, updated_at = NOW() WHERE id = $2',
                    [translated.overview_ar, movie.id]
                );

                stats.movies.translated++;
                console.log(`✅ تم الترجمة (${translated.overview_ar.length} حرف)`);
            } else {
                stats.movies.failed++;
                console.log(`❌ فشل الترجمة`);
            }

            // تأخير بسيط لتجنب rate limiting
            await sleep(1000);

        } catch (error) {
            stats.movies.failed++;
            console.error(`❌ خطأ: ${error.message}`);
        }
    }
}

// ══════════════════════════════════════════════
// Translate TV Series
// ══════════════════════════════════════════════
async function translateSeries(limit = 100) {
    console.log('\n📺 ترجمة أوصاف المسلسلات...\n');

    // جلب المسلسلات بدون overview_ar
    const result = await pool.query(`
    SELECT id, name, overview
    FROM tv_series
    WHERE (overview_ar IS NULL OR overview_ar = '')
      AND overview IS NOT NULL
      AND overview != ''
    LIMIT $1
  `, [limit]);

    stats.series.total = result.rows.length;
    console.log(`📊 وجدنا ${stats.series.total} مسلسل بدون وصف عربي\n`);

    for (const series of result.rows) {
        try {
            console.log(`\n📺 ${series.name} (ID: ${series.id})`);

            // ترجمة الوصف
            const translated = await translateContent({ overview_en: series.overview });

            if (translated.overview_ar) {
                // تحديث قاعدة البيانات
                await pool.query(
                    'UPDATE tv_series SET overview_ar = $1, updated_at = NOW() WHERE id = $2',
                    [translated.overview_ar, series.id]
                );

                stats.series.translated++;
                console.log(`✅ تم الترجمة (${translated.overview_ar.length} حرف)`);
            } else {
                stats.series.failed++;
                console.log(`❌ فشل الترجمة`);
            }

            // تأخير بسيط لتجنب rate limiting
            await sleep(1000);

        } catch (error) {
            stats.series.failed++;
            console.error(`❌ خطأ: ${error.message}`);
        }
    }
}

// ══════════════════════════════════════════════
// Print Stats
// ══════════════════════════════════════════════
function printStats() {
    const duration = ((Date.now() - stats.start) / 60000).toFixed(1);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 النتائج النهائية');
    console.log('═'.repeat(60));

    console.log('\n🎬 الأفلام:');
    console.log(`   المجموع: ${stats.movies.total}`);
    console.log(`   تم الترجمة: ${stats.movies.translated} ✅`);
    console.log(`   فشل: ${stats.movies.failed} ❌`);

    console.log('\n📺 المسلسلات:');
    console.log(`   المجموع: ${stats.series.total}`);
    console.log(`   تم الترجمة: ${stats.series.translated} ✅`);
    console.log(`   فشل: ${stats.series.failed} ❌`);

    console.log(`\n⏱  المدة: ${duration} دقيقة`);
    console.log('═'.repeat(60) + '\n');
}

// ══════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════
async function main() {
    console.log('🚀 بدء ترجمة الأوصاف المفقودة...\n');

    const limit = parseInt(process.argv[2]) || 100;
    console.log(`📝 الحد الأقصى: ${limit} عنصر لكل نوع\n`);

    try {
        // ترجمة الأفلام
        await translateMovies(limit);

        // ترجمة المسلسلات
        await translateSeries(limit);

        // طباعة الإحصائيات
        printStats();

    } catch (error) {
        console.error('💥 خطأ فادح:', error);
    } finally {
        await pool.end();
    }

    console.log('🎉 انتهى!');
}

main().catch(console.error);

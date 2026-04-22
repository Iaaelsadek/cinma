import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const rawUrl = (process.env.COCKROACHDB_URL || '').replace(/^["']|["']$/g, '').trim();
const pool = new Pool({ connectionString: rawUrl, ssl: { rejectUnauthorized: false } });

async function checkContent() {
  try {
    const movies = await pool.query('SELECT COUNT(*) FROM movies');
    const series = await pool.query('SELECT COUNT(*) FROM tv_series');
    const actors = await pool.query('SELECT COUNT(*) FROM actors');
    const seasons = await pool.query('SELECT COUNT(*) FROM seasons');
    const episodes = await pool.query('SELECT COUNT(*) FROM episodes');
    
    console.log('\n📊 المحتوى في قاعدة البيانات:');
    console.log('═══════════════════════════════════════');
    console.log('🎬 الأفلام:', movies.rows[0].count);
    console.log('📺 المسلسلات:', series.rows[0].count);
    console.log('🎭 الممثلين:', actors.rows[0].count);
    console.log('📋 المواسم:', seasons.rows[0].count);
    console.log('🎞️  الحلقات:', episodes.rows[0].count);
    console.log('═══════════════════════════════════════\n');
    
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  }
}

checkContent();

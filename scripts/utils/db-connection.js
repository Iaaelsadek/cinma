import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// ✅ حل دائم: parse الـ connection string بشكل صحيح
function getConnectionConfig() {
    const connectionString = process.env.COCKROACHDB_URL;

    if (!connectionString) {
        throw new Error('COCKROACHDB_URL not found in environment variables');
    }

    // إزالة المسافات وعلامات التنصيص والأحرف الخفية
    const cleanUrl = connectionString
        .trim()
        .replace(/^["']|["']$/g, ''); // إزالة علامات التنصيص من البداية والنهاية

    return {
        connectionString: cleanUrl,
        ssl: {
            rejectUnauthorized: false
        }
    };
}

export function createPool() {
    return new Pool(getConnectionConfig());
}

export async function testConnection() {
    const pool = createPool();
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ الاتصال بقاعدة البيانات ناجح');
        return true;
    } catch (error) {
        console.error('❌ فشل الاتصال بقاعدة البيانات:', error.message);
        return false;
    } finally {
        await pool.end();
    }
}

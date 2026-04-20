import fs from 'fs';
import dotenv from 'dotenv';

// Load current env
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.turso' });

const args = process.argv.slice(2);
const target = args[0]; // 'cockroach' or 'turso'

if (!target || !['cockroach', 'turso'].includes(target)) {
    console.error('\n❌ الرجاء تحديد القاعدة المستهدفة');
    console.log('\nالاستخدام:');
    console.log('  node scripts/switch-database.js cockroach');
    console.log('  node scripts/switch-database.js turso\n');
    process.exit(1);
}

async function switchDatabase() {
    try {
        console.log(`\n🔄 التبديل إلى: ${target.toUpperCase()}...\n`);

        // Read current .env
        let envContent = fs.readFileSync('.env', 'utf8');

        if (target === 'turso') {
            // Switch to Turso
            const tursoUrl = process.env.TURSO_DATABASE_URL;
            const tursoToken = process.env.TURSO_AUTH_TOKEN;

            if (!tursoUrl || !tursoToken) {
                throw new Error('Turso credentials not found in .env.turso');
            }

            // Comment out CockroachDB
            envContent = envContent.replace(
                /^COCKROACHDB_URL=/gm,
                '# COCKROACHDB_URL='
            );

            // Add Turso (if not exists)
            if (!envContent.includes('TURSO_DATABASE_URL')) {
                envContent += `\n# Turso Database (Active)\nTURSO_DATABASE_URL=${tursoUrl}\nTURSO_AUTH_TOKEN=${tursoToken}\n`;
            } else {
                // Uncomment Turso
                envContent = envContent.replace(
                    /^# TURSO_DATABASE_URL=/gm,
                    'TURSO_DATABASE_URL='
                );
                envContent = envContent.replace(
                    /^# TURSO_AUTH_TOKEN=/gm,
                    'TURSO_AUTH_TOKEN='
                );
            }

            console.log('✅ تم التبديل إلى Turso');
            console.log('📍 URL:', tursoUrl);
        } else {
            // Switch to CockroachDB
            // Uncomment CockroachDB
            envContent = envContent.replace(
                /^# COCKROACHDB_URL=/gm,
                'COCKROACHDB_URL='
            );

            // Comment out Turso
            envContent = envContent.replace(
                /^TURSO_DATABASE_URL=/gm,
                '# TURSO_DATABASE_URL='
            );
            envContent = envContent.replace(
                /^TURSO_AUTH_TOKEN=/gm,
                '# TURSO_AUTH_TOKEN='
            );

            console.log('✅ تم التبديل إلى CockroachDB');
            console.log('📍 URL:', process.env.COCKROACHDB_URL?.split('@')[1]?.split('/')[0]);
        }

        // Save .env
        fs.writeFileSync('.env', envContent);

        console.log('\n⚠️  ملاحظة: يجب إعادة تشغيل السيرفر لتطبيق التغييرات\n');
    } catch (error) {
        console.error('\n❌ خطأ:', error.message);
        process.exit(1);
    }
}

switchDatabase();

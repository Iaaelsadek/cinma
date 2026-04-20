#!/usr/bin/env node

/**
 * 🧹 Clean Supabase User Data (Keep Profiles)
 * Deletes all user activity data but keeps user accounts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanUserData() {
    try {
        console.log('📊 جاري فحص البيانات...\n');

        // Get counts before deletion
        const { count: profilesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: watchlistCount } = await supabase.from('watchlist').select('*', { count: 'exact', head: true });
        const { count: continueCount } = await supabase.from('continue_watching').select('*', { count: 'exact', head: true });
        const { count: historyCount } = await supabase.from('history').select('*', { count: 'exact', head: true });

        console.log('📊 البيانات الحالية:');
        console.log(`   👥 الأعضاء: ${profilesCount || 0} (سيتم الاحتفاظ بهم)`);
        console.log(`   ⭐ قائمة المشاهدة: ${watchlistCount || 0}`);
        console.log(`   ▶️  متابعة المشاهدة: ${continueCount || 0}`);
        console.log(`   📜 السجل: ${historyCount || 0}`);
        console.log('');

        // Delete user activity data (keep profiles)
        console.log('🗑️  جاري حذف بيانات النشاط...');

        // Delete watchlist
        const { error: watchlistError } = await supabase.from('watchlist').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (watchlistError) throw watchlistError;
        console.log('   ✅ حذف قائمة المشاهدة');

        // Delete continue_watching
        const { error: continueError } = await supabase.from('continue_watching').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (continueError) throw continueError;
        console.log('   ✅ حذف متابعة المشاهدة');

        // Delete history
        const { error: historyError } = await supabase.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (historyError) throw historyError;
        console.log('   ✅ حذف السجل');

        console.log('');
        console.log('✅ تم تنظيف بيانات النشاط بنجاح!');
        console.log(`👥 تم الاحتفاظ بـ ${profilesCount || 0} عضو`);

    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

cleanUserData();

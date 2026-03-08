
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
    
    if (error) {
        // Fallback: try common tables
        const tables = ['movies', 'tv_series', 'episodes', 'link_checks', 'hidden_content', 'content_health'];
        for (const table of tables) {
            const { error: tError } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (!tError) console.log(`Table exists: ${table}`);
        }
        return;
    }

    console.log(data.map(t => t.table_name));
}

listTables();

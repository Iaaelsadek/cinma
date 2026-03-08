
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getCount() {
    const { count, error } = await supabase
        .from('link_checks')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total rows in link_checks: ${count}`);
}

getCount();

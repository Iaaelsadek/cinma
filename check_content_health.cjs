
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkContentHealth() {
    const { data, error } = await supabase
        .from('content_summaries')
        .select('*')
        .limit(10);
    
    if (error) {
        console.error(error);
        return;
    }

    console.log(data);
}

checkContentHealth();

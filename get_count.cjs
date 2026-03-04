
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8";

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

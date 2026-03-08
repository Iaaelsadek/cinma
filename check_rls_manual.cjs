
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "");

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkRLS() {
    console.log("Checking if link_checks is publicly readable with ANON key...");
    const { data, error, count } = await supabase
        .from('link_checks')
        .select('id', { count: 'exact', head: true });
    
    if (error) {
        console.log("Publicly readable? NO. Error:", error.message);
    } else {
        console.log("Publicly readable? YES. Total rows visible:", count);
    }
}

checkRLS();


const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkMovie(id, threshold = 15) {
    const { data, error } = await supabase
        .from('link_checks')
        .select('*')
        .eq('content_id', id);
    
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Results for ID ${id} (Threshold: ${threshold}):`);
    console.log(`Total reports: ${data.length}`);
    
    const sources = new Map();
    data.forEach(r => {
        sources.set(r.source_name, r.status_code);
    });

    let broken = 0;
    sources.forEach((status, source) => {
        const isBroken = status !== 200 && status !== 201 && status !== 301 && status !== 302;
        if (isBroken) broken++;
        console.log(`  - ${source}: ${status} (${isBroken ? 'BROKEN' : 'WORKING'})`);
    });

    console.log(`\nSummary:`);
    console.log(`Unique sources: ${sources.size}`);
    console.log(`Broken sources: ${broken}`);
    console.log(`Should be hidden? ${broken >= threshold || (sources.size > 0 && broken === sources.size)}`);
}

const id = process.argv[2] || 482600;
const threshold = parseInt(process.argv[3]) || 15;
checkMovie(id, threshold);


const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testSeries() {
    let allRows = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabase
            .from('link_checks')
            .select('content_id, content_type, source_name, status_code, season_number, episode_number')
            .range(from, from + step - 1);
        
        if (error) break;
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data);
        from += step;
        if (data.length < step) break;
    }

    const seriesEpisodes = new Map(); // seriesId -> Set of epKeys
    const seriesDeadEpisodes = new Map(); // seriesId -> Set of dead epKeys

    allRows.forEach(row => {
        if (row.content_type === 'tv') {
            const seriesId = Number(row.content_id);
            const epKey = `${seriesId}-${row.season_number || 1}-${row.episode_number || 1}`;
            
            if (!seriesEpisodes.has(seriesId)) seriesEpisodes.set(seriesId, new Set());
            seriesEpisodes.get(seriesId).add(epKey);
            
            // ... need to check if this episode is dead ...
        }
    });

    console.log(`Checking series 670...`);
    console.log(`Has reports? ${seriesEpisodes.has(670)}`);
}

testSeries();

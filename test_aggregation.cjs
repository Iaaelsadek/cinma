
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testAggregation() {
    // Since we can't run raw SQL easily via client, we'll fetch chunks and aggregate locally
    // OR we can use the existing useHiddenMedia logic but fetch in a loop until all rows are fetched.
    
    let allRows = [];
    let from = 0;
    const step = 1000;
    
    console.log("Fetching all reports from link_checks...");
    
    while (true) {
        const { data, error } = await supabase
            .from('link_checks')
            .select('content_id, content_type, source_name, status_code, season_number, episode_number')
            .range(from, from + step - 1);
        
        if (error) {
            console.error(error);
            break;
        }
        
        if (!data || data.length === 0) break;
        
        allRows = allRows.concat(data);
        console.log(`Fetched ${allRows.length} rows...`);
        from += step;
        
        if (data.length < step) break;
    }

    console.log(`Total reports fetched: ${allRows.length}`);
    
    const movieUnits = new Map();
    const seriesUnits = new Map();

    allRows.forEach(row => {
        const contentId = Number(row.content_id);
        if (row.content_type === 'tv') {
            const epKey = `${contentId}-${row.season_number || 1}-${row.episode_number || 1}`;
            if (!seriesUnits.has(epKey)) seriesUnits.set(epKey, new Map());
            const currentStatus = seriesUnits.get(epKey).get(row.source_name);
            if (currentStatus !== 200) {
                seriesUnits.get(epKey).set(row.source_name, row.status_code);
            }
        } else {
            if (!movieUnits.has(contentId)) movieUnits.set(contentId, new Map());
            const currentStatus = movieUnits.get(contentId).get(row.source_name);
            if (currentStatus !== 200) {
                movieUnits.get(contentId).set(row.source_name, row.status_code);
            }
        }
    });

    const toHide = new Set();
    
    // Movies
    movieUnits.forEach((sources, movieId) => {
        let broken = 0;
        sources.forEach(status => {
            if (status !== 200 && status !== 201 && status !== 301 && status !== 302) broken++;
        });
        if (broken >= 15 || (sources.size > 0 && broken === sources.size)) {
            toHide.add(movieId);
        }
    });

    // Check if 482600 is in toHide
    console.log(`Is movie 482600 in toHide? ${toHide.has(482600)}`);
}

testAggregation();

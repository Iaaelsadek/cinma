
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function simulateHiddenMedia() {
    let allBroken = [];
    let from = 0;
    const step = 1000;

    console.log("Fetching broken links...");
    while (true) {
        const { data, error } = await supabase
            .from('link_checks')
            .select('content_id, content_type, source_name, status_code, season_number, episode_number')
            .range(from, from + step - 1);
        
        if (error) {
            console.error("Fetch error:", error);
            break;
        }
        if (!data || data.length === 0) break;
        
        allBroken = allBroken.concat(data);
        if (data.length < step) break;
        from += step;
    }

    console.log(`Total rows fetched: ${allBroken.length}`);

    const movieUnits = new Map(); 
    const seriesEpisodeUnits = new Map(); 

    allBroken.forEach(row => {
        const contentId = Number(row.content_id);
        if (row.content_type === 'tv') {
            const epKey = `${row.season_number || 1}-${row.episode_number || 1}`;
            if (!seriesEpisodeUnits.has(contentId)) seriesEpisodeUnits.set(contentId, new Map());
            const eps = seriesEpisodeUnits.get(contentId);
            if (!eps.has(epKey)) eps.set(epKey, new Map());
            
            const currentStatus = eps.get(epKey).get(row.source_name);
            if (currentStatus !== 200) {
                eps.get(epKey).set(row.source_name, row.status_code);
            }
        } else {
            if (!movieUnits.has(contentId)) movieUnits.set(contentId, new Map());
            const currentStatus = movieUnits.get(contentId).get(row.source_name);
            if (currentStatus !== 200) {
                movieUnits.get(contentId).set(row.source_name, row.status_code);
            }
        }
    });

    const isUnitDead = (sources, threshold) => {
        let broken = 0;
        sources.forEach(status => {
            if (status !== 200 && status !== 201 && status !== 301 && status !== 302) {
                broken++
            }
        })
        return broken >= threshold || (sources.size > 0 && broken === sources.size)
    };

    const toHide15 = new Set();
    const toHide10 = new Set();

    for (const [movieId, sources] of movieUnits.entries()) {
        if (isUnitDead(sources, 15)) toHide15.add(movieId);
        if (isUnitDead(sources, 10)) toHide10.add(movieId);
    }

    // Checking specifically for ID 482600
    console.log(`\n--- Verification for Movie ID 482600 ---`);
    console.log(`In movieUnits? ${movieUnits.has(482600)}`);
    if (movieUnits.has(482600)) {
        const sources = movieUnits.get(482600);
        console.log(`Source count: ${sources.size}`);
        console.log(`Dead (15)? ${isUnitDead(sources, 15)}`);
        console.log(`Dead (10)? ${isUnitDead(sources, 10)}`);
    }
    console.log(`In toHide15? ${toHide15.has(482600)}`);
    console.log(`In toHide10? ${toHide10.has(482600)}`);

    // Checking specifically for Series ID 5092 (Infinite Challenge)
    console.log(`\n--- Verification for Series ID 5092 ---`);
    console.log(`In seriesEpisodeUnits? ${seriesEpisodeUnits.has(5092)}`);
}

simulateHiddenMedia();

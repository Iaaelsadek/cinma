
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkSeries(id, threshold = 15) {
    const { data, error } = await supabase
        .from('link_checks')
        .select('*')
        .eq('content_id', id)
        .eq('content_type', 'tv');
    
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Results for Series ID ${id} (Threshold: ${threshold}):`);
    console.log(`Total reports: ${data.length}`);
    
    const episodes = new Map(); // epKey -> Map<source_name, status_code>
    
    data.forEach(r => {
        const epKey = `${r.season_number || 1}-${r.episode_number || 1}`;
        if (!episodes.has(epKey)) episodes.set(epKey, new Map());
        episodes.get(epKey).set(r.source_name, r.status_code);
    });

    let deadEpisodesCount = 0;
    episodes.forEach((sources, epKey) => {
        let broken = 0;
        sources.forEach(status => {
            const isBroken = status !== 200 && status !== 201 && status !== 301 && status !== 302;
            if (isBroken) broken++;
        });
        const isDead = broken >= threshold || (sources.size > 0 && broken === sources.size);
        if (isDead) deadEpisodesCount++;
        console.log(`  Episode ${epKey}: ${broken}/${sources.size} broken (${isDead ? 'DEAD' : 'WORKING'})`);
    });

    console.log(`\nSummary:`);
    console.log(`Unique episodes with reports: ${episodes.size}`);
    console.log(`Dead episodes: ${deadEpisodesCount}`);
    
    const { data: epData } = await supabase
        .from('episodes')
        .select('id')
        .eq('series_id', id);
    
    const totalEpisodes = epData?.length || 0;
    console.log(`Total episodes in DB: ${totalEpisodes}`);
    console.log(`Should be hidden? ${deadEpisodesCount >= totalEpisodes && totalEpisodes > 0}`);
}

const id = process.argv[2] || 670;
const threshold = parseInt(process.argv[3]) || 15;
checkSeries(id, threshold);

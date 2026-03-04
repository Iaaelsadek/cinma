
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://lhpuwupbhpcqkwqugkhh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkyODgsImV4cCI6MjA4NjQ4NTI4OH0.QCYzJaWo0mmFQwZjwaNjIJR1jR4wOb4CbqTKxTAaO2w';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getHiddenCounts() {
  try {
    // 1. Get all reports from link_checks
    const { data: reports, error: reportError } = await supabase
      .from('link_checks')
      .select('content_id, content_type, source_name, status_code, season_number, episode_number');
    
    if (reportError) throw reportError;

    // 2. Process reports
    const movieUnits = new Map(); // tmdb_id -> Map<source_name, status_code>
    const seriesEpisodeUnits = new Map(); // series_id -> Map<season-episode, Map<source_name, status_code>>
    const seriesIds = new Set();
    const movieIds = new Set();

    reports.forEach(r => {
      if (r.content_type === 'tv') {
        seriesIds.add(Number(r.content_id));
        const seriesId = Number(r.content_id);
        const epKey = `${r.season_number || 1}-${r.episode_number || 1}`;
        
        if (!seriesEpisodeUnits.has(seriesId)) seriesEpisodeUnits.set(seriesId, new Map());
        const eps = seriesEpisodeUnits.get(seriesId);
        if (!eps.has(epKey)) eps.set(epKey, new Map());
        
        const currentStatus = eps.get(epKey).get(r.source_name);
        if (currentStatus !== 200) {
          eps.get(epKey).set(r.source_name, r.status_code);
        }
      } else {
        movieIds.add(Number(r.content_id));
        const movieId = Number(r.content_id);
        if (!movieUnits.has(movieId)) movieUnits.set(movieId, new Map());
        
        const currentStatus = movieUnits.get(movieId).get(r.source_name);
        if (currentStatus !== 200) {
          movieUnits.get(movieId).set(r.source_name, r.status_code);
        }
      }
    });

    // 3. Get total episode counts for these series
    const { data: episodesData } = await supabase
      .from('episodes')
      .select('series_id')
      .in('series_id', Array.from(seriesIds));

    const episodeCounts = new Map();
    episodesData?.forEach(e => {
      episodeCounts.set(e.series_id, (episodeCounts.get(e.series_id) || 0) + 1);
    });

    // 4. Calculate hidden movies
    let hiddenMovies = 0;
    movieUnits.forEach((sources) => {
      let broken = 0;
      sources.forEach(status => {
        if (status !== 200 && status !== 201 && status !== 301 && status !== 302) {
          broken++;
        }
      });
      if (broken >= 15 || (sources.size > 0 && broken === sources.size)) {
        hiddenMovies++;
      }
    });

    // 5. Calculate hidden series
    let hiddenSeries = 0;
    seriesEpisodeUnits.forEach((episodes, seriesId) => {
      let deadEpisodesCount = 0;
      episodes.forEach(sources => {
        let broken = 0;
        sources.forEach(status => {
          if (status !== 200 && status !== 201 && status !== 301 && status !== 302) {
            broken++;
          }
        });
        if (broken >= 15 || (sources.size > 0 && broken === sources.size)) {
          deadEpisodesCount++;
        }
      });

      const totalEpisodes = episodeCounts.get(seriesId) || episodes.size;
      if (deadEpisodesCount >= totalEpisodes) {
        hiddenSeries++;
      }
    });

    console.log(`HIDDEN_MOVIES: ${hiddenMovies}`);
    console.log(`HIDDEN_SERIES: ${hiddenSeries}`);

  } catch (err) {
    console.error('Error fetching data:', err);
  }
}

getHiddenCounts();

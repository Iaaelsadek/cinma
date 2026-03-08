
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function getFinalReport() {
  console.log('Calculating final hidden content counts...')
  
  const { data: reports, error } = await supabase
    .from('link_checks')
    .select('content_id, content_type, season, episode, source_name')
    .eq('status_code', 0)

  if (error) {
    console.error('Error:', error)
    return
  }

  const deadUnits = new Map()
  const seriesCandidates = new Set()

  reports.forEach(r => {
    const key = `${r.content_id}-${r.content_type}-${r.season || 0}-${r.episode || 0}`
    if (!deadUnits.has(key)) deadUnits.set(key, new Set())
    deadUnits.get(key).add(r.source_name)
    
    if (r.content_type === 'tv') seriesCandidates.add(Number(r.content_id))
  })

  let deadMoviesCount = 0
  const deadEpisodesPerSeries = new Map()

  for (const [key, servers] of deadUnits.entries()) {
    if (servers.size >= 15) {
      const [id, type] = key.split('-')
      if (type === 'movie') deadMoviesCount++
      else deadEpisodesPerSeries.set(Number(id), (deadEpisodesPerSeries.get(Number(id)) || 0) + 1)
    }
  }

  // For series, we need the total episodes count to see if the whole series is dead
  let deadSeriesCount = 0
  if (seriesCandidates.size > 0) {
    const { data: allEpisodes } = await supabase
      .from('episodes')
      .select('id, seasons!inner(series_id)')
      .in('seasons.series_id', Array.from(seriesCandidates))

    const totalCountsPerSeries = new Map()
    allEpisodes?.forEach(ep => {
      const sId = ep.seasons.series_id
      totalCountsPerSeries.set(sId, (totalCountsPerSeries.get(sId) || 0) + 1)
    })

    for (const seriesId of seriesCandidates) {
      const deadCount = deadEpisodesPerSeries.get(seriesId) || 0
      const totalCount = totalCountsPerSeries.get(seriesId) || 0
      if (totalCount > 0 && deadCount >= totalCount) {
        deadSeriesCount++
      }
    }
  }

  console.log('--- FINAL REPORT ---')
  console.log(`Total Dead Movies (Hidden): ${deadMoviesCount}`)
  console.log(`Total Dead Series (Hidden): ${deadSeriesCount}`)
  console.log(`Total Hidden Items: ${deadMoviesCount + deadSeriesCount}`)
}

getFinalReport()

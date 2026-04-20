import { createPool } from './utils/db-connection.js'

const pool = createPool()

async function checkSeasonsData() {
    try {
        // Get The Boys series
        const seriesResult = await pool.query(
            "SELECT id, name FROM tv_series WHERE slug = $1",
            ['the-boys']
        )

        if (seriesResult.rows.length === 0) {
            console.log('❌ Series not found')
            return
        }

        const series = seriesResult.rows[0]
        console.log('✅ Series found:', series)

        // Get seasons
        const seasonsResult = await pool.query(
            `SELECT id, season_number, name, episode_count 
       FROM seasons 
       WHERE series_id = $1 
       ORDER BY season_number ASC`,
            [series.id]
        )

        console.log('\n📊 Seasons data:')
        seasonsResult.rows.forEach(season => {
            console.log(`  Season ${season.season_number}: ${season.name} - ${season.episode_count} episodes`)
        })

        // Check if episode_count is null
        const nullCounts = seasonsResult.rows.filter(s => s.episode_count === null || s.episode_count === 0)
        if (nullCounts.length > 0) {
            console.log('\n⚠️ Seasons with null/zero episode_count:', nullCounts.length)
        }

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await pool.end()
    }
}

checkSeasonsData()

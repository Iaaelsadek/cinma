
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env manually
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest) {
      let val = rest.join('=').trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      process.env[key.trim()] = val
    }
  })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const DOMAIN = process.env.VITE_DOMAIN || 'https://cinma.online'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing ENV variables: SUPABASE_URL/KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function generateSitemap() {
    console.log("🚀 Generating Sitemap...")

    const staticPages = [
        '/',
        '/movies',
        '/series',
        '/plays',
        '/kids',
        '/software',
        '/quran',
        '/ramadan'
    ]

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`

    // 1. Static Pages
    staticPages.forEach(page => {
        sitemap += `  <url>
    <loc>${DOMAIN}${page}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`
    })

    // 2. Movies (Top 5000)
    console.log("... Fetching Movies")
    const { data: movies } = await supabase.from('movies').select('id, updated_at').limit(5000)
    if (movies) {
        movies.forEach(m => {
            sitemap += `  <url>
    <loc>${DOMAIN}/movie/${m.id}</loc>
    <lastmod>${m.updated_at ? m.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`
        })
    }

    // 3. Series (Top 5000)
    console.log("... Fetching Series")
    const { data: series } = await supabase.from('tv_series').select('id, updated_at').limit(5000)
    if (series) {
        series.forEach(s => {
            sitemap += `  <url>
    <loc>${DOMAIN}/tv/${s.id}</loc>
    <lastmod>${s.updated_at ? s.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`
        })
    }
    
    // 4. Videos (All)
    console.log("... Fetching Videos")
    const { data: videos } = await supabase.from('videos').select('id, updated_at').limit(5000)
    if (videos) {
        videos.forEach(v => {
            sitemap += `  <url>
    <loc>${DOMAIN}/video/${v.id}</loc>
    <lastmod>${v.updated_at ? v.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`
        })
    }

    sitemap += `</urlset>`

    fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), sitemap)
    console.log(`✅ Sitemap generated at public/sitemap.xml with ~${(movies?.length || 0) + (series?.length || 0) + (videos?.length || 0) + staticPages.length} URLs.`)
}

generateSitemap()

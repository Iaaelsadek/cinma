
import { createClient } from '@supabase/supabase-js'
import ytSearch from 'yt-search'
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing ENV variables: SUPABASE_URL/KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Categories to fetch
const CATEGORIES = {
  quran: [
    'القرآن الكريم كامل', 'تلاوات خاشعة', 'Holy Quran Recitation', 'سورة البقرة'
  ],
  prophets: [
    'قصص الأنبياء', 'Prophets Stories', 'قصص القرآن'
  ],
  fatwa: [
    'فتاوى وأحكام', 'سؤال وجواب ديني', 'Fatwa Islamic'
  ],
  summary: [
    'ملخص فيلم', 'ملخص مسلسل', 'Movie Summary Arabic', 'Recap Movie'
  ],
  plays_masrah_masr: [
    'مسرح مصر الموسم الاول', 'مسرح مصر الموسم الثاني', 'مسرح مصر الموسم الثالث', 'مسرح مصر كاملة', 'تياترو مصر كاملة'
  ]
}

async function fetchYoutubeVideos(query, category) {
    console.log(`Searching YouTube for: ${query} (${category})`)
    try {
        const r = await ytSearch(query)
        const videos = r.videos.slice(0, 20)

        return videos.map(item => ({
            title: item.title,
            description: item.description,
            url: item.url,
            thumbnail: item.thumbnail,
            category: category,
            views: item.views,
            duration: item.duration.seconds,
            created_at: new Date().toISOString()
        }))
    } catch (e) {
        console.error(`YouTube Search Error (${query}):`, e.message)
        return []
    }
}

async function upsertVideos(videos) {
    if (videos.length === 0) return
    
    for (const video of videos) {
        // Check if video exists by URL first
        const { data: existing } = await supabase
            .from('videos')
            .select('id')
            .eq('url', video.url)
            .single()

        if (existing) {
            console.log(`Video exists: ${video.title.substring(0, 30)}...`)
            continue
        }

        const { error } = await supabase.from('videos').insert({
            title: video.title,
            description: video.description,
            url: video.url,
            thumbnail: video.thumbnail,
            category: video.category,
            views: video.views,
            duration: video.duration,
            created_at: new Date().toISOString()
        })

        if (error) console.error('Error inserting:', error.message)
        else console.log(`Inserted: ${video.title.substring(0, 30)}...`)
    }
}

// Main
(async () => {
    console.log('🚀 Starting YouTube Import (yt-search)...')
    
    // 1. Quran
    for (const q of CATEGORIES.quran) {
        const videos = await fetchYoutubeVideos(q, 'quran')
        await upsertVideos(videos)
    }

    // 2. Prophets
    for (const q of CATEGORIES.prophets) {
        const videos = await fetchYoutubeVideos(q, 'prophets')
        await upsertVideos(videos)
    }

    // 3. Summaries
    for (const q of CATEGORIES.summary) {
        const videos = await fetchYoutubeVideos(q, 'summary')
        await upsertVideos(videos)
    }

    // 4. Fatwa
    for (const q of CATEGORIES.fatwa) {
        const videos = await fetchYoutubeVideos(q, 'fatwa')
        await upsertVideos(videos)
    }

    // 5. Masrah Masr
    for (const q of CATEGORIES.plays_masrah_masr) {
        const videos = await fetchYoutubeVideos(q, 'plays-masrah-masr')
        await upsertVideos(videos)
    }

    console.log('✅ YouTube Import Done.')
})()

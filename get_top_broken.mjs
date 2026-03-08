
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function getTopBroken() {
  const { data, error } = await supabase
    .from('link_checks')
    .select('content_id, content_type, source_name')
    .eq('status_code', 0)
  
  if (error) {
    console.error('Error:', error)
    return
  }

  const counts = new Map()
  data.forEach(r => {
    const key = `${r.content_id}-${r.content_type}`
    if (!counts.has(key)) counts.set(key, new Set())
    counts.get(key).add(r.source_name)
  })

  const sorted = Array.from(counts.entries())
    .map(([key, sources]) => ({ key, count: sources.size }))
    .filter(item => item.count >= 10)
    .sort((a, b) => b.count - a.count)

  console.log('Top Broken Content (10+ broken sources):')
  console.log(JSON.stringify(sorted.slice(0, 10), null, 2))
}

getTopBroken()

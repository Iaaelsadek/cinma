
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkyODgsImV4cCI6MjA4NjQ4NTI4OH0.QCYzJaWo0mmFQwZjwaNjIJR1jR4wOb4CbqTKxTAaO2w'
)

async function getAllBroken() {
  const { data, error } = await supabase
    .from('link_checks')
    .select('content_id, content_type, source_name, status_code')
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
    .sort((a, b) => b.count - a.count)

  console.log('All Broken Content counts:')
  console.log(JSON.stringify(sorted.slice(0, 20), null, 2))
}

getAllBroken()


import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkyODgsImV4cCI6MjA4NjQ4NTI4OH0.QCYzJaWo0mmFQwZjwaNjIJR1jR4wOb4CbqTKxTAaO2w'
)

async function checkMovie482600() {
  const { data, error } = await supabase
    .from('link_checks')
    .select('source_name, status_code')
    .eq('content_id', 482600)
    .eq('status_code', 0)
  
  if (error) {
    console.error('Error:', error)
    return
  }

  const sources = new Set(data.map(r => r.source_name))
  console.log(`Movie 482600 has ${sources.size} broken servers:`, Array.from(sources))
}

checkMovie482600()

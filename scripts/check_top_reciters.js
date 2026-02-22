
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkReciters() {
  const names = ["السديس", "العفاسي", "عبدالباسط", "المنشاوي", "الحصري", "سعود الشريم", "ماهر المعيقلي"]
  
  for (const name of names) {
    const { data, error } = await supabase
      .from('quran_reciters')
      .select('id, name')
      .ilike('name', `%${name}%`)
    
    if (data && data.length > 0) {
      console.log(`Found ${name}:`, data.map(d => d.name).join(', '))
    } else {
      console.log(`Missing ${name}`)
    }
  }
}

checkReciters()

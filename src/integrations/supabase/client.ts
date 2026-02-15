import { createClient } from '@supabase/supabase-js'
import { CONFIG } from '../../lib/constants'

// Fallback to prevent crash if env vars are missing
const sbUrl = CONFIG.SUPABASE_URL || 'https://placeholder.supabase.co'
const sbKey = CONFIG.SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(sbUrl, sbKey)

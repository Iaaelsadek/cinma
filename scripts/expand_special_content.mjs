import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const TARGET_MULTIPLIER = Number(process.argv[2] || 100)
const BATCH_SIZE = 500

const TABLES = [
  { table: 'anime', titleField: 'title' },
  { table: 'games', titleField: 'title' },
  { table: 'software', titleField: 'title' },
  { table: 'quran_reciters', titleField: 'name' }
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getCount = async (table) => {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true })
  if (error) throw new Error(`${table} count failed: ${error.message}`)
  return count ?? 0
}

const getMaxId = async (table) => {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
  if (error) throw new Error(`${table} max id failed: ${error.message}`)
  return Number(data?.[0]?.id || 0)
}

const fetchRows = async (table) => {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`${table} fetch rows failed: ${error.message}`)
  return data || []
}

const cleanRow = (row) => {
  const next = { ...row }
  delete next._force_reload
  delete next.created_at
  delete next.updated_at
  return next
}

const upsertBatch = async (table, batch, retries = 6) => {
  let lastError = null
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' })
    if (!error) return
    lastError = error
    const wait = (2 ** attempt) * 250 + Math.floor(Math.random() * 200)
    console.log(`[RETRY] ${table} attempt=${attempt + 1}/${retries} wait=${wait}ms error=${error.message}`)
    await sleep(wait)
  }
  throw new Error(`${table} upsert failed: ${lastError?.message || 'unknown error'}`)
}

const run = async () => {
  console.log(`[START] multiplier=${TARGET_MULTIPLIER}`)
  for (const { table, titleField } of TABLES) {
    const initialCount = await getCount(table)
    const targetCount = initialCount * TARGET_MULTIPLIER
    const needed = Math.max(0, targetCount - initialCount)
    if (needed === 0) {
      console.log(`[SKIP] ${table} initial=${initialCount} target=${targetCount}`)
      continue
    }

    const sourceRows = await fetchRows(table)
    if (sourceRows.length === 0) {
      console.log(`[SKIP] ${table} has no source rows`)
      continue
    }

    let nextId = await getMaxId(table)
    let generated = 0
    let serial = 1
    console.log(`[BUILD] ${table} initial=${initialCount} target=${targetCount} need=${needed} maxId=${nextId}`)

    while (generated < needed) {
      const batch = []
      while (batch.length < BATCH_SIZE && generated < needed) {
        const source = sourceRows[generated % sourceRows.length]
        nextId += 1
        const row = cleanRow(source)
        row.id = nextId
        if (titleField && typeof row[titleField] === 'string' && row[titleField].trim()) {
          row[titleField] = `${row[titleField]} [Ext ${serial}]`
        } else if (titleField) {
          row[titleField] = `${table} item ${nextId}`
        }
        if ('is_active' in row) row.is_active = true
        if (table === 'quran_reciters') {
          row.letter = row.letter || 'ا'
          row.rewaya = row.rewaya || 'حفص'
          row.server = row.server || ''
          row.category = row.category || 'Others'
          row.surah_list = row.surah_list || ''
        }
        batch.push(row)
        generated += 1
        serial += 1
      }
      await upsertBatch(table, batch)
      console.log(`[UPSERT] ${table} +${batch.length} progress=${generated}/${needed}`)
    }
    const finalCount = await getCount(table)
    console.log(`[DONE] ${table} final=${finalCount}`)
  }

  const totals = {}
  let total = 0
  for (const { table } of TABLES) {
    const c = await getCount(table)
    totals[table] = c
    total += c
  }
  console.log(JSON.stringify({ totals, totalSpecial: total }, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

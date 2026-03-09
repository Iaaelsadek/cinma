import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_TMDB_API_KEY',
  'VITE_API_BASE'
]

const payload = {
  generatedAt: new Date().toISOString(),
  environment: process.env.CF_PAGES ? 'cloudflare-pages' : 'local',
  branch: process.env.CF_PAGES_BRANCH || process.env.BRANCH || null,
  commit: process.env.CF_PAGES_COMMIT_SHA || process.env.COMMIT_REF || null,
  keys: Object.fromEntries(
    required.map((key) => [
      key,
      {
        present: Boolean(process.env[key] && String(process.env[key]).trim().length > 0),
        length: process.env[key] ? String(process.env[key]).trim().length : 0
      }
    ])
  )
}

const outputPath = path.resolve(process.cwd(), 'public', '__env_smoke.json')
await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8')
console.log(JSON.stringify(payload))

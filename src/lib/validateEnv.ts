// ✅ Environment Variables Validation
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_TMDB_API_KEY',
] as const

const optionalEnvVars = [
  'VITE_GEMINI_API_KEY',
  'VITE_GROQ_API_KEY',
  'VITE_MISTRAL_API_KEY',
  'VITE_APK_DOWNLOAD_URL',
] as const

interface ValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

export function validateEnvironment(): ValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!import.meta.env[varName]) {
      missing.push(varName)
    }
  }

  // Check optional variables (warnings only)
  for (const varName of optionalEnvVars) {
    if (!import.meta.env[varName]) {
      warnings.push(`${varName} is not set (optional)`)
    }
  }

  const valid = missing.length === 0

  if (!valid) {
  }

  if (warnings.length > 0 && import.meta.env.DEV) {
  }

  return { valid, missing, warnings }
}

// ✅ Validate on app start
if (import.meta.env.DEV) {
  const result = validateEnvironment()
  
  if (!result.valid) {
    throw new Error(
      `Missing required environment variables:\n${result.missing.join('\n')}\n\n` +
      `Please check your .env.local file.`
    )
  }
}

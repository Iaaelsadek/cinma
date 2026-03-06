export const CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  TMDB_API_KEY: import.meta.env.VITE_TMDB_API_KEY,
  YOUTUBE_API_KEY: import.meta.env.VITE_YOUTUBE_API_KEY,
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
  DOMAIN: import.meta.env.VITE_DOMAIN || 'https://cinma.online',
  API_BASE: import.meta.env.VITE_API_BASE || ''
}

// Strict check for required keys
const requiredKeys = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_TMDB_API_KEY'
]

requiredKeys.forEach(key => {
  if (!import.meta.env[key]) {
    console.error(`❌ CRITICAL ERROR: Missing environment variable: ${key}`)
    // In development, we might want to throw to stop execution
    if (import.meta.env.DEV) {
       // console.warn(`Please set ${key} in your .env file`)
    }
  }
})

export const FLAGS = {
  ADS_ENABLED: false,
}

export function assertEnv() {
  // Disabled to prevent crash
}

export const FALLBACK_SUMMARIES = [
  {
    id: 'eFy80hOZKFA',
    title: 'ملخص فيلم Interstellar',
    description: 'دخل ثقب أسود عشان ينقذ البشرية! ملخص فيلم Interstellar افضل فيلم خيال علمي في التاريخ.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
    url: 'https://www.youtube.com/watch?v=eFy80hOZKFA',
    created_at: '2024-01-01',
    category: 'summary'
  },
  {
    id: 'H9mMeKO-hNE',
    title: 'ملخص فيلم Inception',
    description: 'شخص يتحكم فى احلام البشر ويجعلها حقيقة - ملخص فيلم Inception.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    url: 'https://www.youtube.com/watch?v=H9mMeKO-hNE',
    created_at: '2024-01-02',
    category: 'summary'
  },
  {
    id: 'jb73btFccYk',
    title: 'ملخص فيلم The Dark Knight',
    description: 'الجوكر وصل! ملخص فيلم The Dark Knight وصراع باتمان مع الفوضى.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    url: 'https://www.youtube.com/watch?v=jb73btFccYk',
    created_at: '2024-01-03',
    category: 'summary'
  },
  {
    id: 's-0kR1gR_HQ',
    title: 'ملخص فيلم Oppenheimer',
    description: 'اوبنهايمر مخترع القنبـلة النوويه - قصة حقيقية غيرت العالم.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    url: 'https://www.youtube.com/watch?v=s-0kR1gR_HQ',
    created_at: '2024-01-04',
    category: 'summary'
  },
   {
    id: 'n5wuxdJ6mhs',
    title: 'ملخص فيلم Dune: Part Two',
    description: 'ملخص فيلم دون الجزء الثاني Dune part two - الحرب القادمة.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    url: 'https://www.youtube.com/watch?v=n5wuxdJ6mhs',
    created_at: '2024-01-05',
    category: 'summary'
  },
  {
    id: 'U1CuVDKBDtU',
    title: 'ملخص ثلاثية العراب The Godfather',
    description: 'ملخص ثلاثية العراب كاملة - قصة صعود عائلة كورليوني.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    url: 'https://www.youtube.com/watch?v=U1CuVDKBDtU',
    created_at: '2024-01-06',
    category: 'summary'
  },
  {
    id: 'qV3gOLrn6e4',
    title: 'ملخص سلسلة هاري بوتر كاملة',
    description: 'رحلة هاري بوتر من طفل يتيم إلى أعظم ساحر - ملخص السلسلة كاملة.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
    url: 'https://www.youtube.com/watch?v=qV3gOLrn6e4',
    created_at: '2024-01-07',
    category: 'summary'
  }
]

export const LEGACY_ID_MAP: Record<string, string> = {
  's1': 'eFy80hOZKFA',
  's2': 'H9mMeKO-hNE',
  's3': 'jb73btFccYk',
  's4': 's-0kR1gR_HQ',
  's5': 'n5wuxdJ6mhs',
  's6': 'U1CuVDKBDtU',
  's7': 'qV3gOLrn6e4'
}

import { logger } from './logger'

/**
 * استدعاء مختصر لـ backend لتوليد ملخص بالعربية للفيلم / المسلسل
 * يعتمد على /api/gemini-summary في السيرفر (server/index.js)
 */
export const generateArabicSummary = async (
  title: string,
  originalOverview?: string
): Promise<string> => {
  if (!title) return originalOverview || 'لا يوجد وصف متاح'
  if (!originalOverview) return 'لا يوجد وصف متاح'

  try {
    const res = await fetch('/api/gemini-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, overview: originalOverview })
    })

    if (!res.ok) {
      return originalOverview || 'لا يوجد وصف متاح'
    }

    const data = await res.json() as { summary?: string }
    const summary = (data.summary || '').trim()

    if (!summary) return originalOverview || 'لا يوجد وصف متاح'
    return summary
  } catch (err: any) {
    logger.warn('[Gemini] backend summary failed:', err)
    return originalOverview || 'لا يوجد وصف متاح'
  }
}

/**
 * تصحيح البحث الذكي (حالياً fallback بسيط: إعادة النص كما هو)
 * يمكن لاحقاً نقل منطق الذكاء الاصطناعي بالكامل إلى endpoint backend خاص.
 */
export const correctSearchTerm = async (query: string): Promise<string> => {
  return query
}

/**
 * أفكار / Insights بالذكاء الاصطناعي – معطلة حالياً لأسباب أمنية
 * ترجع مصفوفة فارغة بدلاً من استدعاء Gemini من الفرونت.
 */
export const generateAiInsights = async (
  _title: string,
  _type: 'movie' | 'tv',
  _overview?: string
): Promise<string[]> => {
  return []
}

/**
 * تحليل البحث الذكي – معطل حالياً على الفرونت
 * يمكن لاحقاً تنفيذ /api/gemini-smart-search في السيرفر واستدعاؤه من هنا.
 */
export const processSmartSearch = async (_query: string): Promise<any> => {
  return null
}

/**
 * توليد Playlist بالذكاء الاصطناعي – معطل حالياً على الفرونت
 */
export const generateAiPlaylist = async (_theme?: string, _history?: string): Promise<any> => {
  return null
}

/**
 * ترجمة العناوين للعربية:
 * - تبقي على منطق Supabase + MyMemory فقط
 * - تُزيل أي استدعاء مباشر لـ Gemini من المتصفح
 */
// fallback for legacy code
export const callGeminiWithFallback = async (prompt: string, tag: string): Promise<string> => {
  // original implementation removed; return empty string for now
  return ''
}

export const translateTitleToArabic = async (title: string): Promise<string> => {
  if (!title) return ''

  // 1) لو العنوان أصلاً عربي
  if (/[\u0600-\u06FF]/.test(title)) return title

  // 2) عناوين قصيرة جداً / أرقام فقط نتركها كما هي
  if (title.length < 3 || /^\d+$/.test(title)) return title

  // 3) Cache في localStorage
  const cacheKey = `ar_title_cache_${title.toLowerCase().trim()}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) return cached

  // 4) CockroachDB translations table via API
  try {
    const response = await fetch(`/api/translations/general/${encodeURIComponent(title)}`)
    
    if (response.ok) {
      const data = await response.json()
      if (data && data.arabic_title) {
        localStorage.setItem(cacheKey, data.arabic_title)
        return data.arabic_title
      }
    }
  } catch {
    // تجاهل أخطاء الشبكة / الجدول
  }

  let finalTranslation = title

  // 5) Fallback: MyMemory (كما في الكود الأصلي تقريباً)
  const backoffKey = 'mymemory_backoff_until'
  const backoffUntil = localStorage.getItem(backoffKey)
  const isBackedOff = backoffUntil && Date.now() < parseInt(backoffUntil)

  if (!isBackedOff) {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(title)}&langpair=en|ar`
      )

      if (res.status === 429) {
        logger.warn('[Translation] MyMemory rate limit reached. Pausing requests for 1 hour.')
        localStorage.setItem(backoffKey, String(Date.now() + 3600000))
      } else {
        const data = await res.json()
        if (data.responseData && data.responseData.translatedText) {
          const translated = data.responseData.translatedText
          if (!translated.includes('MYMEMORY') && !translated.includes('QUERY LENGTH LIMIT')) {
            finalTranslation = translated
            localStorage.setItem(cacheKey, finalTranslation)

            // حفظ في CockroachDB API (أفضلية لكن غير حرجة)
            fetch('/api/translations/general', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                original_title: title,
                arabic_title: finalTranslation
              })
            }).catch(() => {})
          }
        }
      }
    } catch {
      // تجاهل أخطاء الشبكة
    }
  }

  return finalTranslation
}


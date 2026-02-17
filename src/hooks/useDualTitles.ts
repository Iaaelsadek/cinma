
import { useState, useEffect } from 'react'
import { translateTitleToArabic } from '../lib/gemini'
import { useLang } from '../state/useLang'

export const useDualTitles = (movie: any) => {
  const { lang } = useLang()
  const [titles, setTitles] = useState<{ main: string; sub: string | null }>({
    main: movie.original_title || movie.original_name || movie.title || movie.name || '',
    sub: null
  })

  useEffect(() => {
    let isMounted = true

    const fetchTitles = async () => {
      // 1. Identify English/Original Title (Main)
      let mainTitle = movie.original_title || movie.original_name || movie.title || movie.name || ''
      
      // 2. Identify Arabic Title (Sub)
      let subTitle = ''
      
      const titleIsArabic = /[\u0600-\u06FF]/.test(movie.title || movie.name || '')
      const originalIsArabic = /[\u0600-\u06FF]/.test(mainTitle)

      if (titleIsArabic) {
        subTitle = movie.title || movie.name
      }

      if (originalIsArabic) {
         // If main is Arabic, we treat it as Main. Sub is null.
         if (isMounted) setTitles({ main: subTitle, sub: null })
         return
      }

      // If we don't have an Arabic title yet, try to translate 'mainTitle'
      if (!subTitle && mainTitle) {
        try {
          const translated = await translateTitleToArabic(mainTitle)
          if (translated && translated !== mainTitle) {
            subTitle = translated
          }
        } catch (e) {
          // ignore
        }
      }

      if (isMounted) {
        setTitles({
          main: mainTitle,
          sub: subTitle && subTitle !== mainTitle ? subTitle : null
        })
      }
    }

    fetchTitles()

    return () => { isMounted = false }
  }, [movie, lang])

  return titles
}

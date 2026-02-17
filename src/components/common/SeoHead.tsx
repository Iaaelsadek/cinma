import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

interface SeoHeadProps {
  title: string
  description?: string
  image?: string
  type?: 'website' | 'article' | 'video.movie' | 'video.tv_show'
  rating?: number
  duration?: string
  releaseDate?: string
  genres?: string[]
  schema?: Record<string, any>
}

export const SeoHead = ({ 
  title, 
  description = 'أكبر منصة عربية لمشاهدة الأفلام والمسلسلات الأجنبية والعربية بجودة عالية. مكتبة ضخمة، سيرفرات سريعة، وبدون إعلانات مزعجة.',
  image = '/og-image.jpg',
  type = 'website',
  rating,
  duration,
  releaseDate,
  genres,
  schema
}: SeoHeadProps) => {
  const { pathname } = useLocation()
  const siteUrl = 'https://cinma.online'
  const url = `${siteUrl}${pathname}`
  const fullTitle = `${title} | أونلاين سينما`

  // Schema.org VideoObject for Google Rich Results
  const videoSchema = type.startsWith('video') ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": title,
    "description": description,
    "thumbnailUrl": [image],
    "uploadDate": releaseDate || new Date().toISOString(),
    "duration": duration || "PT2H", // Default fallback
    "contentUrl": url,
    "embedUrl": url,
    "aggregateRating": rating ? {
      "@type": "AggregateRating",
      "ratingValue": rating,
      "bestRating": 10,
      "ratingCount": 100
    } : undefined,
    "genre": genres
  } : null

  const finalSchema = schema || videoSchema

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content="index, follow" />

      {/* Open Graph */}
      <meta property="og:site_name" content="Online Cinema" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="ar_SA" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      {finalSchema && (
        <script type="application/ld+json">
          {JSON.stringify(finalSchema)}
        </script>
      )}
    </Helmet>
  )
}

import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

interface SeoHeadProps {
  title: string
  description?: string
  image?: string
  type?: 'website' | 'article' | 'video.movie' | 'video.tv_show'
  rating?: number
  ratingCount?: number
  duration?: string
  releaseDate?: string
  genres?: string[]
  schema?: Record<string, any>
  noIndex?: boolean
}

export const SeoHead = ({ 
  title, 
  description = 'أكبر منصة عربية لمشاهدة الأفلام والمسلسلات الأجنبية والعربية بجودة عالية. مكتبة ضخمة، سيرفرات سريعة، وبدون إعلانات مزعجة.',
  image = 'https://placehold.co/1200x630/000000/FFFFFF/png?text=Online+Cinema',
  type = 'website',
  rating,
  ratingCount,
  duration,
  releaseDate,
  genres,
  schema,
  noIndex = false
}: SeoHeadProps) => {
  const { pathname } = useLocation()
  const siteUrl = 'https://cinma.online'
  const normalizedPath = pathname === '/' ? '' : pathname.replace(/\/+$/, '')
  const url = normalizedPath
    ? `${siteUrl}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`
    : siteUrl
  const fullTitle = `${title} | أونلاين سينما`
  const robots = noIndex ? 'noindex,follow' : 'index,follow'

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": pathname.split('/').filter(Boolean).map((segment, index, arr) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": segment.charAt(0).toUpperCase() + segment.slice(1),
      "item": `${siteUrl}/${arr.slice(0, index + 1).join('/')}`
    }))
  }

  // Organization Schema (Brand Entity)
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Online Cinema",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.svg`,
    "sameAs": [
      "https://twitter.com/cinemaonline",
      "https://facebook.com/cinemaonline"
    ]
  }

  const contentSchema = type === 'video.movie' ? {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": title,
    "description": description,
    "image": image,
    "url": url,
    "datePublished": releaseDate || undefined,
    "duration": duration || undefined,
    "aggregateRating": rating != null ? {
      "@type": "AggregateRating",
      "ratingValue": rating,
      "bestRating": 10,
      "ratingCount": ratingCount ?? 1
    } : undefined,
    "genre": genres
  } : type === 'video.tv_show' ? {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": title,
    "description": description,
    "image": image,
    "url": url,
    "datePublished": releaseDate || undefined,
    "aggregateRating": rating != null ? {
      "@type": "AggregateRating",
      "ratingValue": rating,
      "bestRating": 10,
      "ratingCount": ratingCount ?? 1
    } : undefined,
    "genre": genres
  } : null

  const schemas = [
    breadcrumbSchema,
    type === 'website' ? organizationSchema : null,
    schema || contentSchema
  ].filter(Boolean)

  const fullUrl = `https://cinma.online${pathname}`

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="ar_SA" />
      <meta property="og:site_name" content="Cinma Online" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  )
}

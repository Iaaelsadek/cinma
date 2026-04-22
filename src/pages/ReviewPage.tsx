/**
 * ReviewPage Component
 * 
 * Displays a single review with full context including content details.
 * Supports social sharing with Open Graph meta tags.
 * 
 * Task 17.1: Create ReviewPage component
 * Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
 */

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { ReviewCard } from '../components/features/reviews/ReviewCard'
import { PageLoader } from '../components/common/PageLoader'
import { useAuth } from '../hooks/useAuth'
import { fetchBatchContent, ContentDetails } from '../services/contentAPI'
import { Profile } from '../lib/supabase'
import { CONFIG } from '../lib/constants'

const API_BASE = CONFIG.API_BASE || 'https://api.4cima.com'

interface Review {
  id: string
  user_id: string
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv' | 'game' | 'software'
  title?: string
  review_text: string
  rating?: number
  language: 'ar' | 'en'
  contains_spoilers: boolean
  is_verified: boolean
  edit_count: number
  created_at: string
  updated_at: string
  user?: Profile
  helpful_count?: number
  is_liked?: boolean
}

export const ReviewPage = () => {
  const { reviewId } = useParams<{ reviewId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [review, setReview] = useState<Review | null>(null)
  const [content, setContent] = useState<ContentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!reviewId) {
      setError('معرف المراجعة مفقود')
      setLoading(false)
      return
    }

    fetchReviewData()
  }, [reviewId])

  const fetchReviewData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch review from Supabase (user data)
      const reviewResponse = await fetch(`${API_BASE}/api/reviews/${reviewId}`)

      if (reviewResponse.status === 404) {
        setError('المراجعة غير موجودة')
        setLoading(false)
        return
      }

      if (!reviewResponse.ok) {
        throw new Error('فشل في تحميل المراجعة')
      }

      const reviewData = await reviewResponse.json()
      setReview(reviewData)

      // Fetch content details from CockroachDB using external_id
      const contentResults = await fetchBatchContent([
        {
          id: reviewData.external_id,
          content_type: reviewData.content_type,
        }
      ])

      // Content might be null if not found in CockroachDB
      setContent(contentResults[0] || null)
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching review:', err)
      setError('حدث خطأ أثناء تحميل المراجعة')
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!user || !review) return

    try {
      const response = await fetch(`${API_BASE}/api/reviews/${review.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setReview(prev => prev ? {
          ...prev,
          is_liked: data.liked,
          helpful_count: data.like_count
        } : null)
      }
    } catch (err: any) {
      console.error('Error liking review:', err)
    }
  }

  const handleReport = async () => {
    if (!user || !review) return

    const reason = prompt('يرجى تحديد سبب الإبلاغ (10-500 حرف):')
    if (!reason || reason.length < 10 || reason.length > 500) {
      alert('يجب أن يكون السبب بين 10 و 500 حرف')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/reviews/${review.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ reason })
      })

      if (response.ok) {
        alert('تم إرسال البلاغ بنجاح')
      } else {
        const data = await response.json()
        alert(data.error || 'فشل في إرسال البلاغ')
      }
    } catch (err: any) {
      console.error('Error reporting review:', err)
      alert('حدث خطأ أثناء إرسال البلاغ')
    }
  }

  const handleEdit = () => {
    if (!content) return
    // Navigate to content page with edit mode
    const contentPath = content.content_type === 'movie'
      ? `/movie/${content.slug}`
      : content.content_type === 'tv'
        ? `/series/${content.slug}`
        : `/${content.content_type}/${content.slug}`

    navigate(`${contentPath}?editReview=true`)
  }

  const handleDelete = async () => {
    if (!review || !confirm('هل أنت متأكد من حذف هذه المراجعة؟')) return

    try {
      const response = await fetch(`${API_BASE}/api/reviews/${review.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        alert('تم حذف المراجعة بنجاح')
        navigate(-1)
      } else {
        alert('فشل في حذف المراجعة')
      }
    } catch (err: any) {
      console.error('Error deleting review:', err)
      alert('حدث خطأ أثناء حذف المراجعة')
    }
  }

  // Loading state
  if (loading) {
    return <PageLoader />
  }

  // Error state (404 or other errors)
  if (error || !review) {
    return (
      <>
        <Helmet>
          <title>المراجعة غير موجودة | أونلاين سينما</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>

        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              {error || 'المراجعة غير موجودة'}
            </h1>
            <p className="text-zinc-400 mb-6">
              عذراً، لم نتمكن من العثور على المراجعة المطلوبة
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-lumen-gold text-black font-bold rounded-lg hover:bg-lumen-gold/90 transition-colors"
            >
              <ArrowLeft size={20} />
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </>
    )
  }

  // Prepare content display data
  const contentTitle = content?.title || content?.name || 'محتوى غير متوفر'
  const contentPoster = content?.poster_url || '/placeholder-poster.png'
  const contentPath = content
    ? (content.content_type === 'movie'
      ? `/movie/${content.slug}`
      : content.content_type === 'tv'
        ? `/series/${content.slug}`
        : `/${content.content_type}/${content.slug}`)
    : '#'

  // Prepare meta tags for social sharing
  const pageTitle = review.title
    ? `${review.title} - مراجعة ${review.user?.username || 'مستخدم'}`
    : `مراجعة ${review.user?.username || 'مستخدم'} لـ ${contentTitle}`

  const pageDescription = review.review_text.length > 200
    ? review.review_text.substring(0, 200) + '...'
    : review.review_text

  const pageUrl = `https://4cima.com/reviews/${review.id}`
  const pageImage = contentPoster.startsWith('http')
    ? contentPoster
    : `https://4cima.com${contentPoster}`

  return (
    <>
      <Helmet>
        <title>{pageTitle} | أونلاين سينما</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph meta tags for social media sharing */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={pageImage} />
        <meta property="og:locale" content={review.language === 'ar' ? 'ar_SA' : 'en_US'} />
        <meta property="og:site_name" content="4Cima" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageImage} />

        {/* Article metadata */}
        <meta property="article:published_time" content={review.created_at} />
        <meta property="article:modified_time" content={review.updated_at} />
        <meta property="article:author" content={review.user?.username || 'مستخدم'} />

        {/* Schema.org structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Review",
            "itemReviewed": {
              "@type": content?.content_type === 'movie' ? "Movie" : "TVSeries",
              "name": contentTitle,
              "image": pageImage
            },
            "author": {
              "@type": "Person",
              "name": review.user?.username || 'مستخدم'
            },
            "reviewRating": review.rating ? {
              "@type": "Rating",
              "ratingValue": review.rating,
              "bestRating": 10,
              "worstRating": 1
            } : undefined,
            "reviewBody": review.review_text,
            "datePublished": review.created_at,
            "inLanguage": review.language === 'ar' ? 'ar' : 'en'
          })}
        </script>
      </Helmet>

      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>رجوع</span>
          </button>

          {/* Content Card */}
          <div className="mb-6 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
            <div className="flex gap-4">
              <Link to={contentPath} className="flex-shrink-0">
                <img
                  src={contentPoster}
                  alt={contentTitle}
                  className="w-24 h-36 object-cover rounded-lg border border-zinc-700 hover:border-lumen-gold transition-colors"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-poster.png'
                  }}
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  to={contentPath}
                  className="text-xl font-bold text-white hover:text-lumen-gold transition-colors block mb-2"
                >
                  {contentTitle}
                </Link>

                {content?.overview && (
                  <p className="text-sm text-zinc-400 line-clamp-3">
                    {content.overview}
                  </p>
                )}

                {!content && (
                  <p className="text-sm text-zinc-500 italic">
                    تفاصيل المحتوى غير متوفرة حالياً
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Review Card */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-4">
              {review.title || 'مراجعة'}
            </h1>

            <ReviewCard
              review={review}
              currentUserId={user?.id}
              onEdit={user?.id === review.user_id ? handleEdit : undefined}
              onDelete={user?.id === review.user_id ? handleDelete : undefined}
              onLike={user && user.id !== review.user_id ? handleLike : undefined}
              onReport={user && user.id !== review.user_id ? handleReport : undefined}
            />
          </div>

          {/* Additional context */}
          <div className="text-center text-sm text-zinc-500">
            <p>
              شارك هذه المراجعة على وسائل التواصل الاجتماعي
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

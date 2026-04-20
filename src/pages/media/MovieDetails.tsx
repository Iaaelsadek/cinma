import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMovieByIdDB } from '../../lib/db'
import { tmdb } from '../../lib/tmdb'
import { MovieCard } from '../../components/features/media/MovieCard'
import { useAuth } from '../../hooks/useAuth'
import { getProfile, addToWatchlist, isInWatchlist, removeFromWatchlist } from '../../lib/supabase'
import { toast } from '../../lib/toast-manager'
import { motion } from 'framer-motion'
import { Star, Heart, Play } from 'lucide-react'
import { clsx } from 'clsx'
import { useLang } from '../../state/useLang'
import ReactPlayer from 'react-player/lazy'
import { SeoHead } from '../../components/common/SeoHead'
import { useDualTitles } from '../../hooks/useDualTitles'
import { generateArabicSummary } from '../../lib/gemini'
import { SectionHeader } from '../../components/common/SectionHeader'
import { SkeletonDetails } from '../../components/common/Skeletons'
import { generateContentUrl } from '../../lib/utils'
import { RatingInput, AggregateRating, ReviewForm, ReviewList } from '../../components/features/reviews'
import type { ReviewFormData } from '../../components/features/reviews'
import { EditReviewModal } from '../../components/features/reviews/EditReviewModal'
import { ReportReviewDialog } from '../../components/features/reviews/ReportReviewDialog'
import { translateGenres } from '../../lib/genreTranslations'

// Types
type TmdbGenre = { id: number; name: string }
type TmdbVideo = { site?: string; type?: string; key?: string }
type TmdbReleaseDatesGroup = { iso_3166_1: string; release_dates: Array<{ certification?: string }> }
type TmdbSimilarItem = {
  id: number
  title?: string
  name?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  release_date?: string
  first_air_date?: string
  media_type?: 'movie' | 'tv'
  slug?: string | null
}

export const MovieDetails = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { lang } = useLang()
  const queryClient = useQueryClient()

  const [aiSummaryState, setAiSummaryState] = useState<string | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)

  // Parse slug to extract potential year (e.g., "spider-man-2024" -> query "spider man 2024")
  // Also handle legacy URLs ending with ID (e.g., "shelter-12345")
  const parsedSlug = useMemo(() => {
    if (!slug) return { query: '', year: null, legacyId: null }
    const parts = slug.split('-')
    const lastPart = parts[parts.length - 1]

    // Check if last part is a 4-digit year (e.g., 2024)
    if (/^\d{4}$/.test(lastPart)) {
      return {
        query: parts.slice(0, -1).join(' '),
        year: parseInt(lastPart),
        legacyId: null
      }
    }

    // Check if last part is a numeric ID (legacy URLs like "shelter-12345")
    if (/^\d+$/.test(lastPart) && parts.length > 1) {
      return {
        query: parts.slice(0, -1).join(' '),
        year: null,
        legacyId: parseInt(lastPart)
      }
    }

    return { query: slug.replace(/-/g, ' '), year: null, legacyId: null }
  }, [slug])

  // 1. Fetch from DB using slug directly OR legacy ID
  const { data: dbMovie, isLoading: isDbLoading } = useQuery({
    queryKey: ['movie-db', slug, parsedSlug.legacyId],
    queryFn: async () => {
      if (!slug) return null
      // Try by slug first
      let movie = await getMovieByIdDB(slug)
      // If not found and it's a legacy URL with ID at end, try by extracted ID
      if (!movie && parsedSlug.legacyId) {
        movie = await getMovieByIdDB(parsedSlug.legacyId)
      }
      return movie
    },
    enabled: !!slug
  })

  // Derive ID from DB result
  const currentMovieId = dbMovie?.id || parsedSlug.legacyId || null

  // 2. Fetch from backend API if DB lookup failed
  const { data: apiMovie, isLoading: isApiLoading } = useQuery({
    queryKey: ['movie-api', slug, !!dbMovie],
    queryFn: async () => {
      if (!slug || dbMovie) return null

      try {
        // Try backend API by slug
        const response = await fetch(`/api/movies/${slug}`)
        if (response.ok) {
          const movie = await response.json()
          return movie
        }
      } catch (error: any) {
        console.warn('Failed to fetch movie from backend:', error)
      }

      return null
    },
    enabled: !dbMovie && !!slug
  })

  const data = dbMovie || apiMovie
  const isLoading = isDbLoading || (isApiLoading && !dbMovie)

  // Redirect from legacy URLs (slug-id) to clean URLs (slug) when DB has proper slug
  useEffect(() => {
    if (!dbMovie || !slug || !data) return
    const dbSlug = dbMovie.slug
    if (dbSlug && dbSlug !== slug) {
      const cleanUrl = generateContentUrl({ ...dbMovie, media_type: 'movie' })
      navigate(cleanUrl, { replace: true })
    }
  }, [dbMovie, slug, data, navigate])

  // Derived Summary & Trailer
  const aiSummary = aiSummaryState || dbMovie?.ai_summary || null
  const dbTrailerUrl = dbMovie?.trailer_url || null

  // 3. User Profile / Admin Check
  useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => {
      if (!user) return null
      return getProfile(user.id)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5
  })

  // 4. Watchlist Check
  const { data: heart } = useQuery({
    queryKey: ['watchlist-check', user?.id, currentMovieId],
    queryFn: () => {
      if (!user || !currentMovieId) return false
      return isInWatchlist(user.id, currentMovieId.toString(), 'movie')
    },
    enabled: !!user && !!currentMovieId,
    staleTime: 1000 * 60
  })

  // Watchlist Mutation
  const { mutate: toggleHeart, isPending: heartBusy } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('auth')
      if (!currentMovieId) return
      if (heart) return removeFromWatchlist(user.id, currentMovieId.toString(), 'movie')
      return addToWatchlist(user.id, currentMovieId.toString(), 'movie')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-check', user?.id, currentMovieId] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      toast.success(heart ? (lang === 'ar' ? 'تم الحذف من القائمة' : 'Removed from watchlist') : (lang === 'ar' ? 'تم الإضافة للقائمة' : 'Added to watchlist'))
    },
    onError: (err: Error) => {
      if (err.message === 'auth') toast.error(lang === 'ar' ? 'يجب تسجيل الدخول' : 'Please login first')
      else toast.error(lang === 'ar' ? 'حدث خطأ أثناء تحديث القائمة' : 'Error updating watchlist')
    }
  })

  // Hooks
  const dualTitles = useDualTitles(data || {})

  // Auto-translate overview if needed
  useEffect(() => {
    if (!data?.overview || aiSummary) return
    const isArabic = /[\u0600-\u06FF]/.test(data.overview)
    if (!isArabic) {
      generateArabicSummary(data.title || data.name || '', data.overview).then(summary => {
        if (summary && summary !== data.overview) {
          setAiSummaryState(summary)
        }
      })
    }
  }, [data?.overview, data?.title, data?.name, data, aiSummary])

  // Derived Data
  const usCert = useMemo(() => {
    const groups = data?.release_dates?.results as TmdbReleaseDatesGroup[] | undefined
    const us = groups?.find(g => g.iso_3166_1 === 'US')
    const cert = us?.release_dates?.find(r => (r.certification || '').length > 0)?.certification || ''
    return cert.toUpperCase()
  }, [data])

  const { data: similar } = useQuery<{ results: TmdbSimilarItem[] }>({
    queryKey: ['similar-movies', currentMovieId],
    queryFn: async () => {
      if (!currentMovieId) return { results: [] }

      // Use CockroachDB API for similar movies
      try {
        const response = await fetch(`/api/movies/${currentMovieId}/similar?limit=10`)
        if (response.ok) {
          const data = await response.json()
          return { results: data }
        }
      } catch (error: any) {
        console.warn('Failed to fetch similar movies from CockroachDB:', error)
      }

      // Fallback: get random movies from same genres
      if (data?.genres && data.genres.length > 0) {
        try {
          const genreIds = data.genres.map((g: TmdbGenre) => g.id).join(',')
          const response = await fetch(`/api/db/movies/by-genres?genres=${genreIds}&limit=10&exclude=${currentMovieId}`)
          if (response.ok) {
            const movies = await response.json()
            return { results: movies }
          }
        } catch (error: any) {
          console.warn('Failed to fetch movies by genres:', error)
        }
      }

      // Last resort: trending movies
      try {
        const response = await fetch('/api/db/movies/trending?limit=10')
        if (response.ok) {
          const movies = await response.json()
          return { results: movies.filter((m: { id: number }) => m.id !== currentMovieId) }
        }
      } catch (error: any) {
        console.warn('Failed to fetch trending movies:', error)
      }

      return { results: [] }
    },
    enabled: !!currentMovieId
  })

  const schemaData = useMemo(() => {
    if (!data) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Movie",
      "name": data.title || data.name,
      "image": data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : undefined,
      "description": data.overview,
      "datePublished": data.release_date,
      "aggregateRating": data.vote_average ? {
        "@type": "AggregateRating",
        "ratingValue": data.vote_average,
        "bestRating": "10",
        "ratingCount": data.vote_count
      } : undefined
    }
  }, [data])

  if (isLoading) return <SkeletonDetails />
  if (!data) return <div className="text-center py-20 text-white">Movie not found</div>

  // Visual Data - Use poster_url/backdrop_url from backend
  const poster = data.poster_url || (data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : '/placeholder.jpg')
  const backdrop = data.backdrop_url || (data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '')
  const title = data.original_title || data.original_name || dualTitles.sub || dualTitles.main || data.title || data.name
  const overview = data.overview_ar || aiSummary || data.overview || (lang === 'ar' ? 'لا يوجد وصف' : 'No description')
  const rating = data.vote_average ? Math.round(data.vote_average * 10) / 10 : 0
  const year = data.release_date ? new Date(data.release_date).getFullYear() : ''
  const genres = data?.genres || []

  // Check if we are coming from admin or need to resolve slug

  // Trailer Logic
  const trailerKey = data.videos?.results?.find((v: TmdbVideo) => v.type === 'Trailer' && v.site === 'YouTube')?.key
  const finalTrailerUrl = dbTrailerUrl || (trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null)

  // Review Handlers
  const handleRatingChange = async (newRating: number) => {
    if (!user || !currentMovieId) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول' : 'Please login first')
      return
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE || ''
      const response = await fetch(`${apiBase}/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          external_id: currentMovieId.toString(),
          content_type: 'movie',
          rating_value: newRating
        })
      })

      if (!response.ok) throw new Error('Failed to submit rating')

      setUserRating(newRating)
      toast.success(lang === 'ar' ? 'تم حفظ التقييم' : 'Rating saved')
    } catch (error: any) {
      console.error('Error submitting rating:', error)
      toast.error(lang === 'ar' ? 'فشل في حفظ التقييم' : 'Failed to save rating')
    }
  }

  const handleReviewSubmit = async (reviewData: ReviewFormData) => {
    if (!user || !currentMovieId) {
      throw new Error('Authentication required')
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE || ''
      const response = await fetch(`${apiBase}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          external_id: currentMovieId.toString(),
          content_type: 'movie',
          ...reviewData
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit review')
      }

      setShowReviewForm(false)
      toast.success(lang === 'ar' ? 'تم نشر المراجعة' : 'Review published')

      // Refresh reviews list
      queryClient.invalidateQueries({ queryKey: ['reviews', currentMovieId] })
    } catch (error: any) {
      throw new Error(error.message || 'Failed to submit review')
    }
  }

  return (
    <>
      <SeoHead
        title={title}
        description={overview}
        image={poster}
        type="video.movie"
        rating={data.vote_average}
        ratingCount={data.vote_count}
        releaseDate={data.release_date}
        genres={genres.map((g: TmdbGenre) => g.name)}
        schema={schemaData || undefined}
      />

      <div className="min-h-screen bg-black text-white relative w-full overflow-hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 h-[70vh]">
          {backdrop && (
            <div className="absolute inset-0">
              <img src={backdrop} alt="" className="w-full h-full object-cover opacity-40 mask-image-b" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </div>
          )}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-[20vh] pb-20">
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
            {/* Left: Poster */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="relative rounded-xl overflow-hidden shadow-2xl aspect-[2/3] group">
                <img src={poster} alt={title} className="w-full h-full object-cover" loading="lazy" />
              </div>

              <button
                onClick={() => toggleHeart()}
                disabled={heartBusy}
                className={clsx(
                  "w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all",
                  heart ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white/10 hover:bg-white/20",
                  heartBusy && "opacity-50 cursor-not-allowed"
                )}
              >
                <Heart className={clsx("w-5 h-5", heart && "fill-current")} />
                {heart ? (lang === 'ar' ? 'في القائمة' : 'In Watchlist') : (lang === 'ar' ? 'أضف للقائمة' : 'Add to Watchlist')}
              </button>
            </motion.div>

            {/* Right: Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">{title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                  <span>{year}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{rating}</span>
                  </div>
                  <span>•</span>
                  <span>{translateGenres(genres, lang).join(', ')}</span>
                </div>
              </div>

              <p className="text-lg leading-relaxed text-zinc-300 max-w-3xl">
                {overview}
              </p>

              {finalTrailerUrl && (
                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Play className="w-5 h-5 text-red-500" />
                    {lang === 'ar' ? 'الإعلان الرسمي' : 'Official Trailer'}
                  </h3>
                  <div className="aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 max-w-2xl">
                    <ReactPlayer
                      url={finalTrailerUrl}
                      width="100%"
                      height="100%"
                      controls
                      light={backdrop}
                      playIcon={<div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Play className="w-8 h-8 text-white fill-current ml-1" /></div>}
                    />
                  </div>
                </div>
              )}

              {/* Similar Movies */}
              {similar?.results && similar.results.length > 0 && (
                <div className="pt-12">
                  <SectionHeader title={lang === 'ar' ? 'أفلام مشابهة' : 'Similar Movies'} icon={<Play className="w-5 h-5" />} />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {similar.results
                      .filter(item => item.slug && item.slug.trim() !== '' && item.slug !== 'content')
                      .slice(0, 5)
                      .map(item => (
                        <MovieCard key={item.id} movie={{ ...item, media_type: 'movie' }} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ratings & Reviews Section */}
          {currentMovieId && (
            <div className="mt-16 space-y-8">
              {/* Rating Section */}
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {lang === 'ar' ? 'التقييمات والمراجعات' : 'Ratings & Reviews'}
                </h2>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Aggregate Rating */}
                  <div className="flex-shrink-0">
                    <AggregateRating
                      externalId={currentMovieId.toString()}
                      contentType="movie"
                      size="lg"
                      showCount
                    />
                  </div>

                  {/* User Rating */}
                  {user && (
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-white mb-2">
                        {lang === 'ar' ? 'تقييمك' : 'Your Rating'}
                      </label>
                      <RatingInput
                        value={userRating}
                        onChange={handleRatingChange}
                        size="lg"
                        showValue
                      />
                    </div>
                  )}

                  {/* Write Review Button */}
                  {user && !showReviewForm && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-6 py-3 bg-lumen-gold text-black font-bold rounded-lg hover:bg-lumen-gold/90 transition-all"
                    >
                      {lang === 'ar' ? 'اكتب مراجعة' : 'Write Review'}
                    </button>
                  )}
                </div>
              </div>

              {/* Review Form */}
              {showReviewForm && user && (
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {lang === 'ar' ? 'اكتب مراجعتك' : 'Write Your Review'}
                  </h3>
                  <ReviewForm
                    externalId={currentMovieId.toString()}
                    contentType="movie"
                    onSubmit={handleReviewSubmit}
                    onCancel={() => setShowReviewForm(false)}
                  />
                </div>
              )}

              {/* Reviews List */}
              <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <ReviewList
                  externalId={currentMovieId.toString()}
                  contentType="movie"
                  currentUserId={user?.id}
                  onEditReview={(review) => {
                    setEditingReview(review as Review)
                    setShowEditModal(true)
                  }}
                  onDeleteReview={async (reviewId) => {
                    if (!user) return
                    try {
                      const apiBase = import.meta.env.VITE_API_BASE || ''
                      const response = await fetch(`${apiBase}/api/reviews/${reviewId}`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${user.id}`
                        }
                      })
                      if (!response.ok) throw new Error('Failed to delete review')
                      toast.success(lang === 'ar' ? 'تم حذف المراجعة' : 'Review deleted')
                      queryClient.invalidateQueries({ queryKey: ['reviews', currentMovieId] })
                    } catch (error: any) {
                      toast.error(lang === 'ar' ? 'فشل في حذف المراجعة' : 'Failed to delete review')
                    }
                  }}
                  onLikeReview={async (reviewId) => {
                    if (!user) {
                      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول' : 'Please login first')
                      return
                    }
                    try {
                      const apiBase = import.meta.env.VITE_API_BASE || ''
                      const response = await fetch(`${apiBase}/api/reviews/${reviewId}/like`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${user.id}`
                        }
                      })
                      if (!response.ok) throw new Error('Failed to like review')
                      queryClient.invalidateQueries({ queryKey: ['reviews', currentMovieId] })
                    } catch (error: any) {
                      toast.error(lang === 'ar' ? 'فشل في تسجيل الإعجاب' : 'Failed to like review')
                    }
                  }}
                  onReportReview={(reviewId) => {
                    if (!user) {
                      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول' : 'Please login first')
                      return
                    }
                    setReportingReviewId(reviewId)
                    setShowReportDialog(true)
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Edit Review Modal */}
        <EditReviewModal
          review={editingReview}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingReview(null)
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['reviews', currentMovieId] })
          }}
        />

        {/* Report Review Dialog */}
        <ReportReviewDialog
          reviewId={reportingReviewId}
          isOpen={showReportDialog}
          onClose={() => {
            setShowReportDialog(false)
            setReportingReviewId(null)
          }}
          onSuccess={() => {
            // Optional: refresh reviews or show confirmation
          }}
        />
      </div>
    </>
  )
}

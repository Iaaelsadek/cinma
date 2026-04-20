import {useEffect, useState} from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, Link } from 'react-router-dom'
import { Download, Star, ArrowLeft, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import {getSoftwareByIdDB} from '../../lib/db'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '../../lib/toast-manager'
import { RatingInput, AggregateRating, ReviewForm, ReviewList } from '../../components/features/reviews'
import type { ReviewFormData } from '../../components/features/reviews'
import { EditReviewModal } from '../../components/features/reviews/EditReviewModal'
import { ReportReviewDialog } from '../../components/features/reviews/ReportReviewDialog'
import type { Review } from '../../components/features/reviews/EditReviewModal'

export const SoftwareDetails = () => {
  const { slug } = useParams()
  const { lang } = useLang()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [row, setRow] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!slug) return
      setLoading(true)
      const software = await getSoftwareByIdDB(slug)
      if (!cancelled) {
        setRow(software)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!row) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-500 gap-4">
        <Cpu size={48} className="opacity-50" />
        <p>{lang === 'ar' ? 'البرنامج غير موجود' : 'Software not found'}</p>
        <Link to="/software" className="text-sky-500 hover:underline">
          {lang === 'ar' ? 'العودة للمتجر' : 'Return to Store'}
        </Link>
      </div>
    )
  }

  const title = row?.title || (lang === 'ar' ? 'برنامج' : 'Software')
  const rating = typeof row?.rating === 'number' ? row.rating : 0
  const version = row?.version || (row?.release_date ? new Date(row.release_date).getFullYear().toString() : 'Latest')
  const platform = row?.platform || row?.category || 'PC'
  const description = row?.description || (lang === 'ar' ? 'لا يوجد وصف متاح' : 'No description available')
  const poster = row?.poster_url || ''
  const backdrop = row?.backdrop_url || row?.poster_url || ''
  const downloadUrl = row?.download_url || '#'
  const size = row?.size || 'N/A'

  // Get external_id for ratings/reviews bridge
  const externalId = row?.external_id || row?.id?.toString() || null

  // Review Handlers
  const handleRatingChange = async (newRating: number) => {
    if (!user || !externalId) {
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
          external_id: externalId,
          content_type: 'software',
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
    if (!user || !externalId) {
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
          external_id: externalId,
          content_type: 'software',
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
      queryClient.invalidateQueries({ queryKey: ['reviews', externalId] })
    } catch (error: any) {
      throw new Error(error.message || 'Failed to submit review')
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-12 text-zinc-100 font-cairo">
      <Helmet>
        <title>{`${title} | ${lang === 'ar' ? 'برامج' : 'Software'}`}</title>
      </Helmet>

      {/* Hero Background */}
      <div className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505] z-10" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-10 mix-blend-overlay" />
        
        {backdrop ? (
          <motion.img
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{ duration: 1.5 }}
            src={backdrop}
            alt="Backdrop"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-sky-900/20 to-purple-900/20" />
        )}
        
        {/* Back Button */}
        <div className="absolute top-6 left-6 z-50">
           <Link to="/software" className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
             <ArrowLeft size={18} />
             <span>{lang === 'ar' ? 'رجوع' : 'Back'}</span>
           </Link>
        </div>
      </div>

      <div className="relative z-20 px-4 md:px-12 max-w-[2400px] mx-auto w-full -mt-32">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
          
          {/* Poster Column */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-[#111]"
            >
              {poster ? (
                <img src={poster} alt={title} className="h-full w-full object-contain p-4" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <Cpu size={64} className="text-zinc-700" />
                </div>
              )}
            </motion.div>
            
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-4 font-bold text-white hover:bg-sky-500 transition-all shadow-lg shadow-sky-900/20 hover:translate-y-[-2px]"
            >
              <Download size={20} />
              {lang === 'ar' ? 'تحميل البرنامج' : 'Download Now'}
            </a>
          </div>

          {/* Details Column */}
          <div className="pt-4 md:pt-32">
            <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.1 }}
            >
               {/* Meta Badges */}
               <div className="flex flex-wrap items-center gap-3 mb-4">
                 <div className="px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-bold flex items-center gap-1">
                   <Star size={14} fill="currentColor" />
                   {rating}
                 </div>
                 <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-sm">
                   v{version}
                 </div>
                 <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-sm uppercase">
                   {size}
                 </div>
                 <div className="px-3 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-bold uppercase">
                   {platform}
                 </div>
               </div>

               <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                 {title}
               </h1>

               <div className="prose prose-invert prose-lg max-w-none text-zinc-400 mb-8">
                 <p>{description}</p>
               </div>
               
               {/* Additional Info / Specs Placeholder */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-8">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-zinc-500 text-sm mb-1 uppercase tracking-wider">Category</h3>
                    <p className="font-semibold text-white">{row.category || 'Utility'}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-zinc-500 text-sm mb-1 uppercase tracking-wider">License</h3>
                    <p className="font-semibold text-white">Free / Open Source</p>
                  </div>
               </div>

            </motion.div>

            {/* Ratings & Reviews Section */}
            {externalId && (
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
                        externalId={externalId}
                        contentType="software"
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
                        className="px-6 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-all"
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
                      externalId={externalId}
                      contentType="software"
                      onSubmit={handleReviewSubmit}
                      onCancel={() => setShowReviewForm(false)}
                    />
                  </div>
                )}

                {/* Reviews List */}
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <ReviewList
                    externalId={externalId}
                    contentType="software"
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
                        queryClient.invalidateQueries({ queryKey: ['reviews', externalId] })
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
                        queryClient.invalidateQueries({ queryKey: ['reviews', externalId] })
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
        </div>
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
          queryClient.invalidateQueries({ queryKey: ['reviews', externalId] })
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
  )
}

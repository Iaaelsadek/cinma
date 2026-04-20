import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRatingColorFromCert } from '../../lib/tmdb';
import { extractUsTvRating } from '../../lib/dataHelpers';
import {
  addToWatchlist,
  isInWatchlist,
  removeFromWatchlist,
  getProfile,
} from '../../lib/supabase';
import {
  getSeriesById,
  upsertEpisode,
  upsertSeason,
  upsertSeries,
  getSeasons,
  getEpisodes
} from '../../services/contentAPI';
import { getTVByIdDB, getSeasonsDB, getEpisodesDB } from '../../lib/db';
import { translateTitleToArabic } from '../../lib/gemini';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../lib/toast-manager';
import { AddToListModal } from '../../components/features/social/AddToListModal';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, List, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { ShareButton } from '../../components/common/ShareButton';
import { AiInsights } from '../../components/features/media/AiInsights';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useLang } from '../../state/useLang';
import ReactPlayer from 'react-player/lazy';
import { getEmbedUrlByIndex } from '../../services/embedService';
import { SeoHead } from '../../components/common/SeoHead';
import { useDualTitles } from '../../hooks/useDualTitles';
import { NotFound } from '../NotFound';
import { RatingInput, AggregateRating, ReviewForm, ReviewList } from '../../components/features/reviews';
import type { ReviewFormData } from '../../components/features/reviews';
import { EditReviewModal } from '../../components/features/reviews/EditReviewModal';
import { ReportReviewDialog } from '../../components/features/reviews/ReportReviewDialog';
import { translateGenres } from '../../lib/genreTranslations';
import type { Review } from '../../components/features/reviews/EditReviewModal';

interface SeriesDetailsProps {
  slug?: string;
}

const SeriesDetails = ({ slug: propSlug }: SeriesDetailsProps = {}) => {
  const params = useParams();
  const slug = propSlug || params.slug;
  const { user } = useAuth();
  const [seriesId, setSeriesId] = useState<number | null>(null);

  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [heart, setHeart] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fetchError, setFetchError] = useState<boolean>(false);

  const series = useQuery({
    queryKey: ['series', slug],
    queryFn: async () => {
      if (!slug) return null;

      // Fetch from backend API only
      const local = await getTVByIdDB(slug);
      if (local) return local;

      // If not found, return null (no TMDB fallback)
      return null;
    },
    enabled: !!slug,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  // REMOVED: Direct TMDB fetch - all data should come from backend
  const remote = { data: series.data };

  // Handle query errors
  useEffect(() => {
    if (series.isError) {
      setFetchError(true);
    }
  }, [series.isError]);

  // SEO Schema
  const schemaData = useMemo(() => {
    if (!series.data) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      name: series.data.name,
      image: series.data.poster_path
        ? `https://image.tmdb.org/t/p/w780${series.data.poster_path}`
        : undefined,
      description: series.data.overview,
      datePublished: series.data.first_air_date,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: series.data.vote_average,
        bestRating: '10',
        ratingCount: series.data.vote_count,
      },
    };
  }, [series.data]);

  const dualTitles = useDualTitles(series.data || {});

  // tvId derived from loaded series data or current seriesId
  const tvId: number | null = seriesId ?? series.data?.id ?? null;

  // Update seriesId when series data is loaded
  useEffect(() => {
    if (series.data?.id) {
      setSeriesId(series.data.id);
    }
  }, [series.data]);

  const seasons = useQuery({
    queryKey: ['seasons', seriesId, series.data?.id],
    queryFn: async () => {
      if (!series.data || !seriesId) return [];
      const items = await getSeasonsDB(seriesId);
      return items;
    },
    enabled: !!series.data && !!seriesId,
  });

  useEffect(() => {
    if (seasons.data && seasons.data.length && seasonNumber == null) {
      const first = seasons.data.find((s: any) => s.season_number > 0) || seasons.data[0];
      setSeasonNumber(first?.season_number ?? null);
      setSeasonId(first?.id ?? null);
    }
  }, [seasons.data, seasonNumber]);

  const episodes = useQuery({
    queryKey: ['episodes', seriesId, seasonId, seasonNumber],
    queryFn: async () => {
      if (!seasonId || seasonNumber == null || !seriesId) return [];

      // Fetch from backend only
      const rows = await getEpisodesDB(seasonId);
      return rows;
    },
    enabled: !!seasonId && seasonNumber != null && !!seriesId,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || tvId == null) return;
      const inside = await isInWatchlist(user.id, tvId.toString(), 'tv');
      if (!cancelled) setHeart(inside);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tvId]);

  const toggleHeart = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('auth');
      if (heart) {
        await removeFromWatchlist(user.id, tvId!.toString(), 'tv');
      } else {
        await addToWatchlist(user.id, tvId!.toString(), 'tv');
      }
    },
    onSuccess: () => {
      setHeart((h) => !h);
      toast.success(!heart ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة', {
        id: 'watchlist-update',
      });
    },
    onError: (e: any) => {
      if (e.message === 'auth') {
        toast.error('يجب تسجيل الدخول للإضافة إلى المفضلة', { id: 'auth-required' });
      } else {
        toast.error(e?.message || 'خطأ', { id: 'watchlist-error' });
      }
    },
  });

  // Use poster_url/backdrop_url from backend
  const poster = (series.data as any)?.poster_url || (series.data?.poster_path
    ? `https://image.tmdb.org/t/p/w300${series.data.poster_path}`
    : '');
  const backdrop = (series.data as any)?.backdrop_url || (series.data?.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${series.data.backdrop_path}`
    : '');
  const title = series.data?.original_name || (series.data as any)?.original_title || dualTitles.main || series.data?.name || `مسلسل`;
  const arabicTitle = dualTitles.sub;
  const overview = data.overview_ar || series.data?.overview || 'لا يوجد وصف متاح';
  const year = (
    series.data?.first_air_date ? new Date(series.data.first_air_date).getFullYear() : ''
  ) as any;
  const episodeMin =
    Array.isArray((remote.data as any)?.episode_run_time) && (remote.data as any).episode_run_time.length
      ? (remote.data as any).episode_run_time[0]
      : null;
  const runtime = episodeMin != null ? `${Math.floor(episodeMin / 60)}h ${episodeMin % 60}m` : '';
  const vote =
    typeof remote.data?.vote_average === 'number'
      ? Math.round(remote.data.vote_average * 10) / 10
      : null;
  const genres: Array<{ id: number; name: string }> = remote.data?.genres || [];
  const cast: Array<any> = ((remote.data as any)?.aggregate_credits?.cast || []).slice(0, 12);
  const trailerKey: string | null = (() => {
    const vids: Array<any> = (remote.data as any)?.videos?.results || [];
    const yt = vids.find((v) => v.site === 'YouTube' && /trailer/i.test(v.type));
    return yt?.key || null;
  })();
  const [playingEpisode, setPlayingEpisode] = useState<number | null>(null);
  const [serverIndex, setServerIndex] = useState<number>(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTrailer(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const embedUrl = useMemo(() => {
    if (!tvId) return '';
    const s = seasonNumber || 1;
    const e = playingEpisode || 1;
    return getEmbedUrlByIndex('tv', tvId, { season: s, episode: e, serverIndex });
  }, [tvId, seasonNumber, playingEpisode, serverIndex]);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const p = await getProfile(user.id);
      if (!cancelled) setIsAdmin(p?.role === 'admin');
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Fetch user's existing rating on page load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || !tvId) {
        setUserRating(null);
        return;
      }

      try {
        const apiBase = import.meta.env.VITE_API_BASE || '';
        const response = await fetch(
          `${apiBase}/api/ratings/user?external_id=${tvId}&content_type=tv`,
          {
            headers: {
              'Authorization': `Bearer ${user.id}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (!cancelled && data?.rating_value) {
            setUserRating(data.rating_value);
          }
        }
      } catch (error: any) {
        console.error('Error fetching user rating:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tvId]);

  const { lang } = useLang();
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  // Review Handlers
  const handleRatingChange = async (newRating: number) => {
    if (!user || !tvId) {
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
          external_id: tvId.toString(),
          content_type: 'tv',
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
    if (!user || !tvId) {
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
          external_id: tvId.toString(),
          content_type: 'tv',
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
      queryClient.invalidateQueries({ queryKey: ['reviews', tvId] })
    } catch (error: any) {
      throw new Error(error.message || 'Failed to submit review')
    }
  }

  const jsonLdSeries = useMemo(() => {
    const agg: any =
      vote != null
        ? {
          '@type': 'AggregateRating',
          ratingValue: vote,
          ratingCount: typeof remote.data?.vote_count === 'number' ? remote.data.vote_count : 100,
          bestRating: '10',
          worstRating: '1',
        }
        : undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      name: title,
      image: poster || backdrop || '',
      description: (overview || '').slice(0, 200),
      actor: cast.map((c) => ({ '@type': 'Person', name: c.name })).slice(0, 6),
      genre: genres.map((g) => g.name),
      aggregateRating: agg,
      potentialAction: {
        '@type': 'WatchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `https://cinma.online/series/${series.data?.id ?? ''}`,
        },
      },
    };
  }, [vote, remote.data, title, poster, backdrop, overview, cast, genres, series.data?.id]);

  // Early return for error state
  if (fetchError) return <NotFound />;

  return (
    <div className='relative space-y-3'>
      {schemaData && (
        <Helmet>
          <script type='application/ld+json'>{JSON.stringify(schemaData)}</script>
        </Helmet>
      )}
      <SeoHead
        title={`${title} | ${t('مسلسل', 'Series')}`}
        description={overview || ''}
        image={backdrop || poster || undefined}
        type='video.tv_show'
        schema={jsonLdSeries}
      />
      {backdrop && (
        <div className='absolute top-0 left-0 right-0 h-[30vh] -z-10 overflow-hidden'>
          <img
            src={backdrop}
            alt={title}
            className='h-full w-full object-cover opacity-50'
            loading='lazy'
          />
          <div className='absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505]' />
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_240px]'
      >
        {/* Left: Poster & actions */}
        <div className='space-y-2 order-2 md:order-1'>
          <div className='overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md'>
            <div className='aspect-[2/3] w-full bg-zinc-900/40'>
              {poster && (
                <img
                  src={poster}
                  alt={title}
                  className='h-full w-full object-cover'
                  loading='lazy'
                />
              )}
            </div>
          </div>
          {user && (
            <button
              onClick={() => toggleHeart.mutate()}
              className={`w-full rounded-md px-3 py-2 text-xs ${heart ? 'bg-red-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {heart ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
            </button>
          )}
        </div>
        {/* Center: Info */}
        <div className='space-y-2'>
          <div className='rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md'>
            <nav className='text-xs text-zinc-400 mb-2'>
              <Link to='/' className='hover:text-white'>
                {t('الرئيسية', 'Home')}
              </Link>
              <span className='mx-1 text-zinc-600'>/</span>
              <Link to='/series' className='hover:text-white'>
                {t('مسلسلات', 'Series')}
              </Link>
              <span className='mx-1 text-zinc-600'>/</span>
              <span className='text-white'>{title}</span>
            </nav>

            <div className='flex flex-col gap-1'>
              <h1 className='text-2xl font-extrabold tracking-tight text-white'>{title}</h1>
              {arabicTitle && (
                <h2 className='text-lg text-primary font-arabic opacity-90'>{arabicTitle}</h2>
              )}
            </div>

            <div className='mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-300'>
              {year && <span className='rounded bg-white/10 px-2 py-0.5'>{year}</span>}
              {runtime && <span className='rounded bg-white/10 px-2 py-0.5'>{runtime}</span>}
              {vote != null && (
                <span className='rounded bg-white/10 px-2 py-0.5 text-yellow-400 font-bold'>
                  ★ {vote}
                </span>
              )}
            </div>

            {!!genres.length && (
              <div className='mt-2 flex flex-wrap gap-2'>
                {genres.map((g) => (
                  <Link
                    key={g.id}
                    to={`/series/genre/${g.id}`}
                    className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-zinc-300 hover:bg-white/10'
                  >
                    {translateGenres([g], lang)[0]}
                  </Link>
                ))}
              </div>
            )}

            <p className='mt-3 text-sm leading-relaxed text-zinc-300'>{overview}</p>

            <AiInsights
              title={series.data?.name || ''}
              type='tv'
              overview={series.data?.overview || ''}
              className='mt-6'
            />

            <div className='mt-3 no-scrollbar flex gap-2 overflow-x-auto pb-1'>
              {(seasons.data || [])
                .filter((s: any) => (s.season_number ?? 0) >= 0)
                .map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSeasonNumber(s.season_number);
                      const found = seasons.data?.find(
                        (x: any) => x.season_number === s.season_number
                      );
                      setSeasonId(found?.id ?? null);
                      setPlayingEpisode(null);
                    }}
                    className={`rounded-full px-3 py-1 text-xs whitespace-nowrap ${seasonNumber === s.season_number ? 'bg-primary text-white' : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'}`}
                  >
                    {t('الموسم', 'S')} {s.season_number}
                  </button>
                ))}
            </div>
          </div>

          {!!cast.length && (
            <div className='rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md'>
              <div className='mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider'>
                {t('طاقم العمل', 'Cast')}
              </div>
              <div className='no-scrollbar flex gap-2 overflow-x-auto pb-1'>
                {cast.map((p) => {
                  const img = p.profile_path
                    ? `https://image.tmdb.org/t/p/w185${p.profile_path}`
                    : '';
                  return (
                    <div key={p.id} className='w-16 shrink-0 text-center'>
                      <div className='mx-auto h-16 w-16 overflow-hidden rounded-full bg-zinc-800 border border-white/5'>
                        {img && (
                          <img
                            src={img}
                            alt={p.name}
                            className='h-full w-full object-cover'
                            loading='lazy'
                          />
                        )}
                      </div>
                      <div className='mt-1 truncate text-[10px] text-zinc-300'>{p.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Trailer + actions */}
        <div className='space-y-2 order-3'>
          <div className='overflow-hidden rounded-xl border border-white/10 bg-black/60 p-2 backdrop-blur-md'>
            <div className='aspect-video w-full overflow-hidden rounded-md'>
              {playingEpisode ? (
                <iframe
                  title='player'
                  src={embedUrl}
                  className='h-full w-full'
                  allow='autoplay; fullscreen; picture-in-picture'
                  referrerPolicy='no-referrer'
                />
              ) : trailerKey && showTrailer ? (
                <ReactPlayer
                  url={`https://www.youtube.com/watch?v=${trailerKey}`}
                  width='100%'
                  height='100%'
                  light={true}
                  controls
                  playIcon={
                    <div className='bg-primary rounded-full p-4'>
                      <Play className='w-8 h-8 text-white fill-current' />
                    </div>
                  }
                />
              ) : (
                <div className='flex h-full items-center justify-center text-sm text-zinc-400'>
                  {!showTrailer && trailerKey ? (
                    <div className='animate-pulse bg-zinc-800 w-full h-full' />
                  ) : (
                    'لا يوجد تريلر'
                  )}
                </div>
              )}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setServerIndex(0)}
              className={`rounded-md px-4 h-10 text-xs ${serverIndex === 0 ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}
            >
              vidsrc
            </button>
            <button
              onClick={() => setServerIndex(1)}
              className={`rounded-md px-4 h-10 text-xs ${serverIndex === 1 ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}
            >
              2embed
            </button>
            <button
              onClick={() => setServerIndex(2)}
              className={`rounded-md px-4 h-10 text-xs ${serverIndex === 2 ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}
            >
              embed.su
            </button>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <ShareButton title={title} text={overview?.slice(0, 100)} />
            {user && (
              <button
                onClick={() => setShowListModal(true)}
                className='p-2 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-lumen-gold transition-colors'
              >
                <List className='w-5 h-5' />
              </button>
            )}
            <Link
              to={`/watch/${tvId ?? ''}?type=tv&season=${seasonNumber || 1}&episode=${playingEpisode || 1}`}
              className='flex-1 rounded-md bg-gradient-to-r from-primary to-luxury-purple h-10 flex items-center justify-center text-white font-bold min-w-[120px]'
            >
              {t('شاهد الآن', 'Watch Now')}
            </Link>
            <Link
              to={`/watch/${tvId ?? ''}?type=tv&season=${seasonNumber || 1}&episode=1`}
              className='rounded-md border border-white/10 bg-white/10 px-4 h-10 flex items-center text-white hover:bg-white/20'
            >
              {t('تحميل', 'Download')}
            </Link>
          </div>
        </div>
      </motion.div>

      <section className='space-y-3'>
        <h2 className='text-lg font-semibold'>{t('الحلقات', 'Episodes')}</h2>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
          {(episodes.data || []).map((e: any) => {
            const still = e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : '';
            return (
              <button
                key={e.id}
                onClick={() => setPlayingEpisode(e.episode_number || 1)}
                className={clsx(
                  'group relative overflow-hidden rounded-xl border transition-all duration-300',
                  playingEpisode === e.episode_number
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                )}
              >
                <div className='aspect-video w-full overflow-hidden bg-zinc-900'>
                  {still ? (
                    <img
                      src={still}
                      alt={e.name}
                      className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-110'
                      loading='lazy'
                    />
                  ) : (
                    <div className='flex h-full items-center justify-center text-[10px] text-zinc-600 uppercase tracking-tighter italic'>
                      No Still
                    </div>
                  )}
                  <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
                  <div className='absolute bottom-2 left-2 right-2 flex items-center justify-between'>
                    <span className='text-[10px] font-black text-white/90 uppercase tracking-tighter'>
                      Ep {e.episode_number}
                    </span>
                    <div className='rounded-full bg-primary/20 p-1 backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100'>
                      <Play className='h-2 w-2 text-primary fill-current' />
                    </div>
                  </div>
                </div>
                <div className='p-2 text-right'>
                  <div className='truncate text-[10px] font-bold text-white group-hover:text-primary transition-colors'>
                    {e.name || `Episode ${e.episode_number}`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Ratings & Reviews Section */}
      {tvId && (
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
                  externalId={tvId.toString()}
                  contentType="tv"
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
                externalId={tvId.toString()}
                contentType="tv"
                onSubmit={handleReviewSubmit}
                onCancel={() => setShowReviewForm(false)}
              />
            </div>
          )}

          {/* Reviews List */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <ReviewList
              externalId={tvId.toString()}
              contentType="tv"
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
                  queryClient.invalidateQueries({ queryKey: ['reviews', tvId] })
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
                  queryClient.invalidateQueries({ queryKey: ['reviews', tvId] })
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

      {/* Edit Review Modal */}
      <EditReviewModal
        review={editingReview}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingReview(null)
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['reviews', tvId] })
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

      {showListModal && user && tvId && (
        <AnimatePresence>
          <AddToListModal
            contentId={tvId}
            contentType='tv'
            onClose={() => setShowListModal(false)}
            lang={lang}
            userId={user.id}
          />
        </AnimatePresence>
      )}
    </div>
  );
};

export default SeriesDetails;

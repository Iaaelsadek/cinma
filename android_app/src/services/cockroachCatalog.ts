/**
 * cockroachCatalog.ts — يجلب المحتوى من CockroachDB عبر web API
 * يُستخدم كـ fallback عندما Supabase غير متاح
 */
import { HomeContentItem } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cinma.online/api';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const buildPoster = (path?: string | null): string | null =>
  path ? (path.startsWith('http') ? path : `${TMDB_IMG}${path}`) : null;

const CINEMA_PLACEHOLDER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';

const GENRE_MAP: Record<number, string> = {
  28: 'أكشن', 12: 'مغامرة', 16: 'رسوم', 35: 'كوميديا',
  80: 'جريمة', 99: 'وثائقي', 18: 'دراما', 10751: 'عائلي',
  14: 'خيال', 36: 'تاريخ', 27: 'رعب', 878: 'خيال علمي',
  53: 'إثارة', 10749: 'رومانسية', 10752: 'حرب',
};

function resolveGenre(genres?: any[]): string | undefined {
  if (!genres?.length) return undefined;
  const first = genres[0];
  if (typeof first === 'object' && first?.name) return first.name;
  if (typeof first === 'number') return GENRE_MAP[first];
  return String(first);
}

/** جلب أفلام رائجة من CockroachDB */
export async function fetchCrdbMovies(limit = 20): Promise<HomeContentItem[]> {
  try {
    const res = await fetch(`${API_URL}/db/movies/trending?limit=${limit}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map((m: any): HomeContentItem => ({
      id: `movie-${m.id}`,
      tmdbId: m.id,
      title: m.title,
      poster: buildPoster(m.poster_path) || CINEMA_PLACEHOLDER,
      mediaType: 'movie',
      year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : undefined,
      rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : undefined,
      genre: resolveGenre(m.genres),
    }))
  } catch {
    return []
  }
}

/** جلب مسلسلات رائجة من CockroachDB */
export async function fetchCrdbSeries(limit = 20): Promise<HomeContentItem[]> {
  try {
    const res = await fetch(`${API_URL}/db/tv/trending?limit=${limit}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map((s: any): HomeContentItem => ({
      id: `tv-${s.id}`,
      tmdbId: s.id,
      title: s.name,
      poster: buildPoster(s.poster_path) || CINEMA_PLACEHOLDER,
      mediaType: 'tv',
      year: s.first_air_date ? parseInt(s.first_air_date.slice(0, 4)) : undefined,
      rating: s.vote_average ? parseFloat(s.vote_average.toFixed(1)) : undefined,
      genre: resolveGenre(s.genres),
    }))
  } catch {
    return []
  }
}

/** بحث موحد في CockroachDB */
export async function searchCrdbContent(q: string, limit = 20): Promise<HomeContentItem[]> {
  try {
    const res = await fetch(`${API_URL}/db/search?q=${encodeURIComponent(q)}&limit=${limit}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map((item: any): HomeContentItem => ({
      id: `${item.media_type}-${item.id}`,
      tmdbId: item.id,
      title: item.name,
      poster: buildPoster(item.poster_path) || CINEMA_PLACEHOLDER,
      mediaType: item.media_type,
      year: item.air_date ? parseInt(item.air_date.slice(0, 4)) : undefined,
      rating: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : undefined,
      genre: resolveGenre(item.genres),
    }))
  } catch {
    return []
  }
}

/** جلب تفاصيل فيلم من CockroachDB */
export async function fetchCrdbMovieDetails(tmdbId: number) {
  try {
    const res = await fetch(`${API_URL}/db/movies/${tmdbId}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/** جلب تفاصيل مسلسل من CockroachDB */
export async function fetchCrdbSeriesDetails(tmdbId: number) {
  try {
    const res = await fetch(`${API_URL}/db/tv/${tmdbId}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * dbCatalog.ts — يجلب المحتوى من CockroachDB عبر API
 * بدلاً من استهلاك TMDB API
 */
import { supabase } from './supabase';
import { HomeContentItem, MediaType } from './types';

export type { HomeContentItem };

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://cinma.online/api/db';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

// خريطة genre IDs → أسماء عربية
const GENRE_MAP: Record<number, string> = {
  28: 'أكشن', 12: 'مغامرة', 16: 'رسوم', 35: 'كوميديا',
  80: 'جريمة', 99: 'وثائقي', 18: 'دراما', 10751: 'عائلي',
  14: 'خيال', 36: 'تاريخ', 27: 'رعب', 10402: 'موسيقى',
  9648: 'غموض', 10749: 'رومانسية', 878: 'خيال علمي',
  53: 'إثارة', 10752: 'حرب', 37: 'غرب أمريكي',
  10759: 'أكشن', 10762: 'أطفال', 10763: 'أخبار',
  10764: 'واقع', 10765: 'خيال علمي', 10767: 'حواري',
  10768: 'سياسة', 10766: 'صابونة',
};

const resolveGenre = (genres?: string[] | number[]): string | undefined => {
  if (!genres || genres.length === 0) return undefined;
  const first = genres[0];
  // لو رقم → حوّله لاسم عربي
  if (typeof first === 'number') return GENRE_MAP[first] || undefined;
  // لو نص رقمي → حوّله
  const num = parseInt(String(first), 10);
  if (!isNaN(num)) return GENRE_MAP[num] || undefined;
  // لو نص عادي → استخدمه مباشرة
  return String(first);
};

// Cinematic placeholder — gradient dark background with film icon
const CINEMA_PLACEHOLDER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';

const buildPoster = (path?: string | null) =>
  path
    ? path.startsWith('http') ? path : `${TMDB_IMG}${path}`
    : null;

// ── Movies ────────────────────────────────────────────────────────────────────

export type DbMovie = {
  id: string;
  title: string;
  arabic_title?: string;
  overview?: string;
  genres?: string[];
  release_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  tmdb_id?: number;
  vote_average?: number;
  popularity?: number;
  original_language?: string;
  category?: string;
  featured?: boolean;
  is_active?: boolean;
  runtime?: number;
};

export type DbSeries = {
  id: string;
  name: string;
  arabic_name?: string;
  overview?: string;
  genres?: string[];
  first_air_date?: string;
  poster_path?: string;
  tmdb_id?: number;
  vote_average?: number;
  popularity?: number;
  original_language?: string;
  category?: string;
  featured?: boolean;
  is_active?: boolean;
};

const mapMovie = (m: DbMovie): HomeContentItem => ({
  id: `movie-${m.tmdb_id || m.id}`,
  tmdbId: m.tmdb_id || 0,
  title: m.arabic_title || m.title,
  poster: buildPoster(m.poster_path) || CINEMA_PLACEHOLDER,
  mediaType: 'movie',
  year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : undefined,
  rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : undefined,
  genre: resolveGenre(m.genres as any),
});

const mapSeries = (s: DbSeries): HomeContentItem => ({
  id: `tv-${s.tmdb_id || s.id}`,
  tmdbId: s.tmdb_id || 0,
  title: s.arabic_name || s.name,
  poster: buildPoster(s.poster_path) || CINEMA_PLACEHOLDER,
  mediaType: 'tv',
  year: s.first_air_date ? parseInt(s.first_air_date.slice(0, 4)) : undefined,
  rating: s.vote_average ? parseFloat(s.vote_average.toFixed(1)) : undefined,
  genre: resolveGenre(s.genres as any),
});

/** جلب أفلام مميزة أو الأكثر شعبية */
export const fetchDbMovies = async (opts?: {
  featured?: boolean;
  category?: string;
  language?: string;
  limit?: number;
  page?: number;
}): Promise<HomeContentItem[]> => {
  try {
    const limit = opts?.limit ?? 20;
    const page = opts?.page ?? 1;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (page > 1) params.append('page', page.toString());

    // Use search endpoint for filtering, trending for simple queries
    if (opts?.featured || opts?.category || opts?.language) {
      const searchBody: any = { limit, page };
      if (opts.featured) searchBody.featured = true;
      if (opts.category) searchBody.category = opts.category;
      if (opts.language) searchBody.language = opts.language;

      const response = await fetch(`${API_BASE}/movies/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      });

      if (!response.ok) return [];
      const data = await response.json();
      return (data as DbMovie[]).map(mapMovie);
    } else {
      // Simple trending query
      const response = await fetch(`${API_BASE}/movies/trending?${params.toString()}`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data as DbMovie[]).map(mapMovie);
    }
  } catch {
    return [];
  }
};

/** جلب مسلسلات مميزة أو الأكثر شعبية */
export const fetchDbSeries = async (opts?: {
  featured?: boolean;
  category?: string;
  language?: string;
  limit?: number;
  page?: number;
}): Promise<HomeContentItem[]> => {
  try {
    const limit = opts?.limit ?? 20;
    const page = opts?.page ?? 1;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (page > 1) params.append('page', page.toString());

    // Use search endpoint for filtering, trending for simple queries
    if (opts?.featured || opts?.category || opts?.language) {
      const searchBody: any = { limit, page };
      if (opts.featured) searchBody.featured = true;
      if (opts.category) searchBody.category = opts.category;
      if (opts.language) searchBody.language = opts.language;

      const response = await fetch(`${API_BASE}/tv/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      });

      if (!response.ok) return [];
      const data = await response.json();
      return (data as DbSeries[]).map(mapSeries);
    } else {
      // Simple trending query
      const response = await fetch(`${API_BASE}/tv/trending?${params.toString()}`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data as DbSeries[]).map(mapSeries);
    }
  } catch {
    return [];
  }
};

/** جلب روابط البث من جدول embed_links */
export const fetchDbEmbedLinks = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<Array<{ name: string; url: string; quality: string }>> => {
  try {
    const column = mediaType === 'movie' ? 'movie_id' : 'series_id';

    // أولاً: ابحث عن الـ id الداخلي بالـ tmdb_id
    const table = mediaType === 'movie' ? 'movies' : 'tv_series';
    const titleCol = mediaType === 'movie' ? 'id' : 'id';
    const { data: contentData } = await supabase
      .from(table)
      .select(titleCol)
      .eq('tmdb_id', tmdbId)
      .limit(1)
      .single();

    if (!contentData) return [];

    const { data, error } = await supabase
      .from('embed_links')
      .select('server_name,url,quality,is_active')
      .eq(column, (contentData as any).id)
      .eq('is_active', true);

    if (error || !data || data.length === 0) return [];

    return data.map((d: any) => ({
      name: d.server_name || 'سيرفر',
      url: d.url,
      quality: d.quality || 'Auto',
    }));
  } catch {
    return [];
  }
};

/** جلب كل المحتوى للصفحة الرئيسية — أقسام متنوعة بدون تكرار */
export const fetchDbHomeContent = async (): Promise<{
  featured: HomeContentItem[];
  movies: HomeContentItem[];
  series: HomeContentItem[];
  trending: HomeContentItem[];
  arabic: HomeContentItem[];
  korean: HomeContentItem[];
  turkish: HomeContentItem[];
  topRated: HomeContentItem[];
}> => {
  const [
    featuredMovies, featuredSeries,
    allMovies, allSeries,
    arabicMovies, arabicSeries,
    koreanSeries, turkishSeries,
    topMovies, topSeries,
  ] = await Promise.all([
    fetchDbMovies({ featured: true, limit: 12 }),
    fetchDbSeries({ featured: true, limit: 12 }),
    fetchDbMovies({ limit: 40 }),
    fetchDbSeries({ limit: 40 }),
    fetchDbMovies({ language: 'ar', limit: 20 }),
    fetchDbSeries({ language: 'ar', limit: 20 }),
    fetchDbSeries({ language: 'ko', limit: 20 }),
    fetchDbSeries({ language: 'tr', limit: 20 }),
    fetchDbMovies({ limit: 30 }),
    fetchDbSeries({ limit: 30 }),
  ]);

  // Global dedup — كل عنصر يظهر في قسم واحد فقط
  const usedIds = new Set<string>();
  const take = (items: HomeContentItem[], limit: number): HomeContentItem[] => {
    const result: HomeContentItem[] = [];
    for (const item of items) {
      if (usedIds.has(item.id)) continue;
      usedIds.add(item.id);
      result.push(item);
      if (result.length >= limit) break;
    }
    return result;
  };

  const featured = take([...featuredMovies, ...featuredSeries], 15);
  const trending = take(interleave(allMovies, allSeries), 18);
  // topRated — أعلى تقييم من ما تبقى
  const topRatedPool = [...topMovies, ...topSeries]
    .filter(i => !usedIds.has(i.id))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const topRated = take(topRatedPool, 18);
  const arabic = take(interleave(arabicMovies, arabicSeries), 18);
  const korean = take(koreanSeries, 15);
  const turkish = take(turkishSeries, 15);
  // ما تبقى للأقسام العامة
  const movies = take(allMovies.filter(i => !usedIds.has(i.id)), 20);
  const series = take(allSeries.filter(i => !usedIds.has(i.id)), 20);

  return { featured, movies, series, trending, arabic, korean, turkish, topRated };
};

/** دمج مصفوفتين بالتناوب */
const interleave = (a: HomeContentItem[], b: HomeContentItem[]): HomeContentItem[] => {
  const result: HomeContentItem[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
};

/** بحث في قاعدة البيانات */
export const searchDbContent = async (
  query: string,
  limit = 20
): Promise<HomeContentItem[]> => {
  if (!query.trim()) return [];
  try {
    const response = await fetch(
      `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    
    // API returns unified results with media_type field
    return (data as Array<any>).map((item) => {
      if (item.media_type === 'movie') {
        return mapMovie(item as DbMovie);
      } else {
        return mapSeries(item as DbSeries);
      }
    });
  } catch {
    return [];
  }
};

/** جلب محتوى مصفى (للـ BrowseScreen) */
export const fetchDbFiltered = async (opts: {
  mediaType: 'movie' | 'tv';
  genre?: string;
  language?: string;
  year?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: HomeContentItem[]; hasMore: boolean }> => {
  try {
    const limit = opts.limit ?? 20;
    const page = opts.page ?? 1;

    const searchBody: any = { limit, page };
    if (opts.genre) searchBody.genre = opts.genre;
    if (opts.language) searchBody.language = opts.language;
    if (opts.year) searchBody.year = opts.year;
    if (opts.sortBy) searchBody.sortBy = opts.sortBy;

    const endpoint = opts.mediaType === 'movie' 
      ? `${API_BASE}/movies/search` 
      : `${API_BASE}/tv/search`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) return { items: [], hasMore: false };
    const data = await response.json();

    const items = opts.mediaType === 'movie'
      ? (data as DbMovie[]).map(mapMovie)
      : (data as DbSeries[]).map(mapSeries);

    return { items, hasMore: data.length === limit };
  } catch {
    return { items: [], hasMore: false };
  }
};

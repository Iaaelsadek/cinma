import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { fetchJson } from '../utils/network';
import { buildAllServerSources } from './serverCatalog';
import { MediaType, HomeContentItem } from './types';

export type { HomeContentItem, MediaType };

const WEBSITE_BASE_URL = 'https://cinma.online';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseAuthConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      storage: AsyncStorage as any,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'cinema_online_mobile_auth',
    },
  }
);

type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  media_type?: MediaType;
};

type RuntimeConfig = {
  VITE_TMDB_API_KEY?: string;
};

type CatalogCachePayload = {
  watchlist: HomeContentItem[];
  continueWatching: HomeContentItem[];
  updatedAt: number;
};

const CATALOG_CACHE_KEY = 'live_catalog_cache_v2';
const CATALOG_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory lock to prevent concurrent fetches
let fetchInProgress: Promise<CatalogCachePayload> | null = null;

const readCatalogCache = async (): Promise<CatalogCachePayload | null> => {
  const raw = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CatalogCachePayload;
    if (!Array.isArray(parsed.watchlist) || !Array.isArray(parsed.continueWatching)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCatalogCache = async (payload: CatalogCachePayload) => {
  await AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(payload));
};

const getTitle = (item: TmdbItem) => item.title || item.name || 'Untitled';

const getPoster = (posterPath?: string | null) =>
  posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : `${TMDB_IMAGE_BASE}/3bhkrj58Vtu7enYsRolD1fZdja1.jpg`;

const mapTmdbItems = (items: TmdbItem[], forcedMediaType?: MediaType): HomeContentItem[] =>
  items
    .filter((item) => !!item.id)
    .map((item) => {
      const mediaType = forcedMediaType || item.media_type || 'movie';
      return {
        id: `${mediaType}-${item.id}`,
        tmdbId: item.id,
        title: getTitle(item),
        poster: getPoster(item.poster_path),
        mediaType,
      };
    });

const uniqueItems = (items: HomeContentItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const withProgress = (items: HomeContentItem[]) =>
  items.map((item, index) => ({
    ...item,
    progress: Math.min(0.95, 0.2 + index * 0.08),
  }));

// Use the env key directly — avoids an extra network round-trip to the website
const TMDB_KEY_ENV = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';

const getTmdbKey = async (): Promise<string> => {
  // 1. Prefer the env variable (fastest, no network)
  if (TMDB_KEY_ENV) return TMDB_KEY_ENV;
  // 2. Fallback: fetch from website runtime config
  try {
    const runtime = await fetchJson<RuntimeConfig>(`${WEBSITE_BASE_URL}/api/runtime-config`);
    const key = runtime?.VITE_TMDB_API_KEY || '';
    if (key) return key;
  } catch {}
  throw new Error('TMDB API key not configured. Set EXPO_PUBLIC_TMDB_API_KEY in .env');
};

const fetchTmdb = async (tmdbKey: string, path: string, language = 'ar-SA') =>
  fetchJson<{ results?: TmdbItem[] }>(
    `https://api.themoviedb.org/3/${path}${path.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(tmdbKey)}&language=${encodeURIComponent(language)}`
  );

const doFetchCatalog = async (): Promise<CatalogCachePayload> => {
  const tmdbKey = await getTmdbKey();
  const [trendingData, moviesData, topRatedMoviesData, tvData] = await Promise.all([
    fetchTmdb(tmdbKey, 'trending/all/week'),
    fetchTmdb(tmdbKey, 'movie/popular?page=1'),
    fetchTmdb(tmdbKey, 'movie/top_rated?page=1'),
    fetchTmdb(tmdbKey, 'tv/popular?page=1'),
  ]);

  const trending = mapTmdbItems(
    (trendingData.results || []).filter((e) => e.media_type === 'movie' || e.media_type === 'tv')
  );
  const popularMovies = mapTmdbItems(moviesData.results || [], 'movie');
  const topRatedMovies = mapTmdbItems(topRatedMoviesData.results || [], 'movie');
  const popularSeries = mapTmdbItems(tvData.results || [], 'tv');

  const watchlist = uniqueItems([...popularSeries, ...popularMovies, ...topRatedMovies]).slice(0, 24);
  const continueWatching = withProgress(uniqueItems([...trending, ...popularSeries])).slice(0, 18);

  const payload: CatalogCachePayload = { watchlist, continueWatching, updatedAt: Date.now() };
  await writeCatalogCache(payload);
  return payload;
};

/**
 * Fetches catalog with deduplication — concurrent callers share the same promise.
 * Also respects TTL cache to avoid redundant network calls.
 */
const fetchCatalog = async (): Promise<CatalogCachePayload> => {
  // Check TTL cache first
  const cached = await readCatalogCache();
  if (cached && Date.now() - cached.updatedAt < CATALOG_TTL_MS) {
    return cached;
  }

  // Deduplicate concurrent fetches
  if (fetchInProgress) return fetchInProgress;

  fetchInProgress = doFetchCatalog().finally(() => {
    fetchInProgress = null;
  });

  return fetchInProgress;
};

export const getWatchList = async (_userId: string): Promise<HomeContentItem[]> => {
  try {
    const { watchlist } = await fetchCatalog();
    if (watchlist.length > 0) return watchlist;
    const cached = await readCatalogCache();
    return cached?.watchlist || [];
  } catch {
    const cached = await readCatalogCache();
    return cached?.watchlist || [];
  }
};

export const getContinueWatching = async (_userId: string): Promise<HomeContentItem[]> => {
  try {
    const { continueWatching } = await fetchCatalog();
    if (continueWatching.length > 0) return continueWatching;
    const cached = await readCatalogCache();
    return cached?.continueWatching || [];
  } catch {
    const cached = await readCatalogCache();
    return cached?.continueWatching || [];
  }
};

export const fetchStreamSources = async (
  contentId: string,
  season = 1,
  episode = 1
): Promise<Array<{ name: string; url: string; quality?: string }>> => {
  const match = contentId.match(/^(movie|tv)-(\d+)$/);
  if (!match) return [];

  const mediaType = match[1] as 'movie' | 'tv';
  const tmdbId = parseInt(match[2], 10);

  // 1. جرب embed_links من Supabase أولاً
  try {
    const table = mediaType === 'movie' ? 'movies' : 'tv_series';
    const col = mediaType === 'movie' ? 'movie_id' : 'series_id';
    const { data: contentRow } = await supabase
      .from(table).select('id').eq('tmdb_id', tmdbId).limit(1).single();
    if (contentRow) {
      const { data: links } = await supabase
        .from('embed_links')
        .select('server_name,url,quality,is_active')
        .eq(col, (contentRow as any).id)
        .eq('is_active', true);
      if (links && links.length > 0) {
        return links.map((d: any) => ({
          name: d.server_name || 'سيرفر',
          url: d.url,
          quality: d.quality || 'Auto',
        }));
      }
    }
  } catch {}

  // 2. fallback: بناء روابط السيرفرات الـ11 المجانية
  const sources = buildAllServerSources(tmdbId, mediaType, season, episode);
  if (sources.length > 0) return sources;

  return [];
};

export const fetchLiveChannels = async (): Promise<
  Array<{ id: string; name: string; url: string; category: string }>
> => {
  try {
    const { data } = await supabase
      .from('channels')
      .select('id, name, stream_url, category')
      .order('id');

    if (data && data.length > 0) {
      return data.map((d: any) => ({
        id: String(d.id),
        name: d.name,
        url: d.stream_url,
        category: d.category || 'عام',
      }));
    }
  } catch (e) {
    console.log('Error fetching channels', e);
  }
  return [];
};

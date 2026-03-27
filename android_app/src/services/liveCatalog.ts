import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeContentItem } from './types';
import { NativeCategoryRow, NativeMediaItem } from './nativeCatalog';
import { pickStream } from '../utils/streams';
import { fetchDbHomeContent } from './dbCatalog';

const CATALOG_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CATALOG_ROWS_CACHE_KEY = 'live_catalog_rows_v1';

type CatalogRowsCache = {
  rows: NativeCategoryRow[];
  fetchedAt: number;
};

const mapHomeItem = (item: HomeContentItem): NativeMediaItem => ({
  id: item.id,
  title: item.title,
  poster: item.poster,
  streamUrl: pickStream(item.tmdbId),
  year: item.year,
  rating: item.rating,
  genre: item.genre,
});

// استبعاد الوثائقيات من الأقسام
const excludeDocumentary = (items: NativeMediaItem[]) =>
  items.filter(i => !i.genre || !['وثائقي', 'Documentary', 'وثائقية'].includes(i.genre));

const uniqueById = (items: NativeMediaItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const readRowsCache = async (): Promise<CatalogRowsCache | null> => {
  const raw = await AsyncStorage.getItem(CATALOG_ROWS_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CatalogRowsCache;
  } catch {
    return null;
  }
};

const writeRowsCache = async (rows: NativeCategoryRow[]) => {
  const payload: CatalogRowsCache = { rows, fetchedAt: Date.now() };
  await AsyncStorage.setItem(CATALOG_ROWS_CACHE_KEY, JSON.stringify(payload));
};

export const getLiveHomeRows = async (forceRefresh = false): Promise<NativeCategoryRow[]> => {
  if (!forceRefresh) {
    const cached = await readRowsCache();
    if (cached && Date.now() - cached.fetchedAt < CATALOG_TTL_MS) {
      return cached.rows;
    }
  }

  try {
    const { featured, movies, series, trending, arabic, korean, turkish, topRated } =
      await fetchDbHomeContent();

    const toRow = (items: HomeContentItem[]) => excludeDocumentary(uniqueById(items.map(mapHomeItem)));

    const rFeatured  = toRow(featured);
    const rTrending  = toRow(trending);
    const rTopRated  = toRow(topRated);
    const rArabic    = toRow(arabic);
    const rKorean    = toRow(korean);
    const rTurkish   = toRow(turkish);
    const rMovies    = toRow(movies);
    const rSeries    = toRow(series);

    const rows: NativeCategoryRow[] = [
      ...(rFeatured.length  > 0 ? [{ id: 'db-featured',  title: '✨ المميز والمختار',        items: rFeatured  }] : []),
      ...(rTrending.length  > 0 ? [{ id: 'db-trending',  title: '🔥 الأكثر مشاهدة الآن',    items: rTrending  }] : []),
      ...(rTopRated.length  > 0 ? [{ id: 'db-toprated',  title: '⭐ الأعلى تقييماً',         items: rTopRated  }] : []),
      ...(rArabic.length    > 0 ? [{ id: 'db-arabic',    title: '🎬 أفلام ومسلسلات عربية',  items: rArabic    }] : []),
      ...(rKorean.length    > 0 ? [{ id: 'db-korean',    title: '🇰🇷 مسلسلات كورية',         items: rKorean    }] : []),
      ...(rTurkish.length   > 0 ? [{ id: 'db-turkish',   title: '🇹🇷 مسلسلات تركية',         items: rTurkish   }] : []),
      ...(rMovies.length    > 0 ? [{ id: 'db-movies',    title: '🎥 أفلام متنوعة',           items: rMovies    }] : []),
      ...(rSeries.length    > 0 ? [{ id: 'db-series',    title: '📺 مسلسلات متنوعة',         items: rSeries    }] : []),
    ];

    if (rows.length > 0) {
      await writeRowsCache(rows);
      return rows;
    }

    const cached = await readRowsCache();
    return cached?.rows || [];
  } catch {
    const cached = await readRowsCache();
    return cached?.rows || [];
  }
};

export const getLiveCatalogItems = async (): Promise<NativeMediaItem[]> => {
  const rows = await getLiveHomeRows();
  const map = new Map<string, NativeMediaItem>();
  rows.forEach((row) => {
    row.items.forEach((item) => {
      if (!map.has(item.id)) map.set(item.id, item);
    });
  });
  return Array.from(map.values());
};

export const invalidateCatalogCache = async () => {
  await AsyncStorage.removeItem(CATALOG_ROWS_CACHE_KEY);
};

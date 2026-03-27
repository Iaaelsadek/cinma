import { NativeCategoryRow, NativeMediaItem } from './nativeCatalog';
import { getRecentAnalyticsEvents } from './analytics';
import { getFeatureFlags } from './featureFlags';

const scoreFromText = (title: string, hints: string[]) => {
  const normalized = title.toLowerCase();
  return hints.reduce((acc, hint) => (normalized.includes(hint) ? acc + 1 : acc), 0);
};

export const buildRecommendedRow = async (items: NativeMediaItem[]): Promise<NativeCategoryRow | null> => {
  if (items.length === 0) return null;
  const events = await getRecentAnalyticsEvents(140);
  const titleHints = events
    .map((event) => String(event.payload?.title ?? ''))
    .filter((value) => value.length > 0)
    .flatMap((value) => value.toLowerCase().split(/\s+/))
    .filter((token) => token.length > 2)
    .slice(-80);
  const scored = [...items]
    .map((item) => ({
      item,
      score: scoreFromText(item.title, titleHints) + (item.id.startsWith('tv-') ? 0.2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map((entry) => entry.item);
  if (scored.length === 0) return null;
  return {
    id: 'recommended',
    title: 'مقترح لك',
    items: scored,
  };
};

export const rankSearchResults = async (query: string, items: NativeMediaItem[]) => {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const flags = await getFeatureFlags();
  const variant = flags.experiments.searchRanking;
  const events = await getRecentAnalyticsEvents(80);
  const recentlyWatched = new Set(
    events
      .map((event) => String(event.payload?.contentId ?? ''))
      .filter((id) => id.length > 0)
  );
  return [...items]
    .map((item) => {
      const t = item.title.toLowerCase();
      const starts = t.startsWith(q) ? (variant === 'v2' ? 6 : 5) : 0;
      const includes = t.includes(q) ? (variant === 'v2' ? 2.5 : 3) : 0;
      const watchedBoost = recentlyWatched.has(item.id) ? (variant === 'v2' ? 2.2 : 1.5) : 0;
      return { item, score: starts + includes + watchedBoost };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
};

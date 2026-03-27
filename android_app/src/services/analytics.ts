import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCachedExperimentTags } from './featureFlags';
import { fetchJson } from '../utils/network';

type AnalyticsEventName =
  | 'app_open'
  | 'auth_login'
  | 'auth_login_google'
  | 'auth_register'
  | 'profile_selected'
  | 'home_loaded'
  | 'row_opened'
  | 'content_tapped'
  | 'playback_started'
  | 'playback_progress'
  | 'playback_completed'
  | 'winback_scheduled'
  | 'retention_campaign_scheduled';

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  timestamp: number;
  payload?: Record<string, string | number | boolean | null>;
};

const QUEUE_KEY = 'analytics_queue_v1';
const MAX_QUEUE_SIZE = 300;
const WEBSITE_BASE_URL = 'https://cinma.online';

const readQueue = async (): Promise<AnalyticsEvent[]> => {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AnalyticsEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const writeQueue = async (events: AnalyticsEvent[]) => {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE_SIZE)));
};

export const trackEvent = async (
  name: AnalyticsEventName,
  payload?: Record<string, string | number | boolean | null>
) => {
  const experiments = getCachedExperimentTags();
  const current = await readQueue();
  current.push({
    name,
    timestamp: Date.now(),
    payload: {
      ...(payload || {}),
      exp_home_layout: experiments.homeLayout,
      exp_search_ranking: experiments.searchRanking,
    },
  });
  await writeQueue(current);
};

export const flushAnalytics = async () => {
  const queued = await readQueue();
  if (queued.length === 0) return { flushed: 0 };
  try {
    await fetchJson<unknown>(`${WEBSITE_BASE_URL}/api/mobile/analytics/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: queued, sentAt: Date.now() }),
    });
    await AsyncStorage.removeItem(QUEUE_KEY);
    return { flushed: queued.length };
  } catch {
    return { flushed: 0 };
  }
};

export const getQueuedAnalyticsCount = async () => {
  const queued = await readQueue();
  return queued.length;
};

export const getRecentAnalyticsEvents = async (limit = 120) => {
  const queued = await readQueue();
  return queued.slice(-limit);
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchJson } from '../utils/network';

const WEBSITE_BASE_URL = 'https://cinma.online';
const FLAGS_KEY = 'feature_flags_v1';

export type FeatureFlags = {
  liveTabEnabled: boolean;
  aiMoodEnabled: boolean;
  watchPartyEnabled: boolean;
  experiments: {
    homeLayout: string;
    searchRanking: string;
  };
};

const defaultFlags: FeatureFlags = {
  liveTabEnabled: true,
  aiMoodEnabled: false,
  watchPartyEnabled: false,
  experiments: {
    homeLayout: 'control',
    searchRanking: 'v1',
  },
};

let cachedFlags: FeatureFlags = defaultFlags;

const readStoredFlags = async (): Promise<FeatureFlags> => {
  const raw = await AsyncStorage.getItem(FLAGS_KEY);
  if (!raw) return defaultFlags;
  try {
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return {
      ...defaultFlags,
      ...parsed,
      experiments: {
        ...defaultFlags.experiments,
        ...(parsed.experiments || {}),
      },
    };
  } catch {
    return defaultFlags;
  }
};

export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  const stored = await readStoredFlags();
  cachedFlags = stored;
  return stored;
};

export const getCachedExperimentTags = () => cachedFlags.experiments;

export const refreshFeatureFlags = async (): Promise<FeatureFlags> => {
  try {
    const data = await fetchJson<Partial<FeatureFlags>>(
      `${WEBSITE_BASE_URL}/api/mobile/feature-flags`
    );
    const merged: FeatureFlags = {
      ...defaultFlags,
      ...data,
      experiments: {
        ...defaultFlags.experiments,
        ...(data.experiments || {}),
      },
    };
    cachedFlags = merged;
    await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return getFeatureFlags();
  }
};

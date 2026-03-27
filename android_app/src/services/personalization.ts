import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeCategoryRow } from './nativeCatalog';

type Profile = {
  id: string;
  name: string;
  avatar: string;
  isKids: boolean;
};

const ACTIVE_PROFILE_KEY = 'active_profile';

const categoryScoresByProfile: Record<string, Record<string, number>> = {
  dad: {
    trending: 5,
    'english-movies': 4,
    'arabic-movies': 3,
    'indian-movies': 2,
    'korean-drama': 1,
  },
  mom: {
    'korean-drama': 5,
    'arabic-movies': 4,
    trending: 3,
    'english-movies': 2,
    'indian-movies': 1,
  },
  kids: {
    trending: 5,
    'english-movies': 4,
    'indian-movies': 3,
    'arabic-movies': 2,
    'korean-drama': 1,
  },
};

const getProfileName = (profile: Profile | null) => {
  if (!profile?.name) return 'dad';
  return profile.name.trim().toLowerCase();
};

export const getActiveProfile = async (): Promise<Profile | null> => {
  const raw = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
};

export const rankRowsForProfile = (rows: NativeCategoryRow[], profile: Profile | null): NativeCategoryRow[] => {
  const profileKey = getProfileName(profile);
  const scores = categoryScoresByProfile[profileKey] || categoryScoresByProfile.dad;
  return [...rows].sort((a, b) => {
    const scoreA = scores[a.id] ?? 0;
    const scoreB = scores[b.id] ?? 0;
    return scoreB - scoreA;
  });
};

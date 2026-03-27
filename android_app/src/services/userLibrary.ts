import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeMediaItem } from './nativeCatalog';

type ProgressEntry = {
  positionSec: number;
  durationSec: number;
  updatedAt: number;
};

const MY_LIST_KEY = 'my_list_v1';
const PROGRESS_KEY = 'watch_progress_v1';

const readJson = async <T>(key: string, fallback: T): Promise<T> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = async <T>(key: string, value: T) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export type UserLibrarySnapshot = {
  myListIds: string[];
  progress: Record<string, ProgressEntry>;
};

export const getMyListIds = async (): Promise<string[]> => readJson<string[]>(MY_LIST_KEY, []);

export const isInMyList = async (contentId: string) => {
  const ids = await getMyListIds();
  return ids.includes(contentId);
};

export const toggleMyList = async (contentId: string) => {
  const ids = await getMyListIds();
  const exists = ids.includes(contentId);
  const next = exists ? ids.filter((id) => id !== contentId) : [contentId, ...ids];
  await writeJson(MY_LIST_KEY, next.slice(0, 200));
  return !exists;
};

export const getMyListItems = async (items: NativeMediaItem[]) => {
  const ids = await getMyListIds();
  const indexMap = new Map(ids.map((id, idx) => [id, idx]));
  return items
    .filter((item) => indexMap.has(item.id))
    .sort((a, b) => (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0));
};

export const saveWatchProgress = async (contentId: string, positionSec: number, durationSec: number) => {
  if (durationSec <= 0) return;
  const progress = await readJson<Record<string, ProgressEntry>>(PROGRESS_KEY, {});
  progress[contentId] = {
    positionSec: Math.max(0, positionSec),
    durationSec: Math.max(1, durationSec),
    updatedAt: Date.now(),
  };
  await writeJson(PROGRESS_KEY, progress);
};

export const clearWatchProgress = async (contentId: string) => {
  const progress = await readJson<Record<string, ProgressEntry>>(PROGRESS_KEY, {});
  if (!progress[contentId]) return;
  delete progress[contentId];
  await writeJson(PROGRESS_KEY, progress);
};

export const getContinueWatchingItems = async (items: NativeMediaItem[]) => {
  const progress = await readJson<Record<string, ProgressEntry>>(PROGRESS_KEY, {});
  const eligible = items.filter((item) => {
    const entry = progress[item.id];
    if (!entry) return false;
    const ratio = entry.positionSec / Math.max(entry.durationSec, 1);
    return ratio > 0.03 && ratio < 0.97;
  });
  return eligible.sort((a, b) => (progress[b.id]?.updatedAt ?? 0) - (progress[a.id]?.updatedAt ?? 0));
};

export const getProgressRatio = async (contentId: string) => {
  const progress = await readJson<Record<string, ProgressEntry>>(PROGRESS_KEY, {});
  const entry = progress[contentId];
  if (!entry) return 0;
  return Math.min(1, Math.max(0, entry.positionSec / Math.max(entry.durationSec, 1)));
};

export const getUserLibrarySnapshot = async (): Promise<UserLibrarySnapshot> => {
  const [myListIds, progress] = await Promise.all([
    getMyListIds(),
    readJson<Record<string, ProgressEntry>>(PROGRESS_KEY, {}),
  ]);
  return { myListIds, progress };
};

export const applyRemoteUserLibrarySnapshot = async (snapshot: UserLibrarySnapshot) => {
  const local = await getUserLibrarySnapshot();
  const mergedIds = Array.from(new Set([...(snapshot.myListIds || []), ...local.myListIds])).slice(0, 200);
  const mergedProgress = { ...local.progress };
  Object.entries(snapshot.progress || {}).forEach(([contentId, remoteEntry]) => {
    const localEntry = mergedProgress[contentId];
    if (!localEntry || remoteEntry.updatedAt > localEntry.updatedAt) {
      mergedProgress[contentId] = remoteEntry;
    }
  });
  await Promise.all([writeJson(MY_LIST_KEY, mergedIds), writeJson(PROGRESS_KEY, mergedProgress)]);
};

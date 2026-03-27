import * as FileSystem from 'expo-file-system';

// Use FileSystem.cacheDirectory instead of the broken Paths API
const CACHE_FOLDER = `${FileSystem.cacheDirectory}media_cache/`;

export const initCache = async () => {
  const info = await FileSystem.getInfoAsync(CACHE_FOLDER);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
  }
};

export const cacheStreamSegment = async (url: string, segmentId: string): Promise<string> => {
  await initCache();
  const path = `${CACHE_FOLDER}${segmentId}.ts`;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    try {
      await FileSystem.downloadAsync(url, path);
      return path;
    } catch (e) {
      console.error('Cache failed', e);
      return url;
    }
  }
  return path;
};

export const clearCache = async () => {
  await FileSystem.deleteAsync(CACHE_FOLDER, { idempotent: true });
  await initCache();
};

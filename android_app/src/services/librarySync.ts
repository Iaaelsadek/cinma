import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyRemoteUserLibrarySnapshot, getUserLibrarySnapshot, UserLibrarySnapshot } from './userLibrary';
import { getSession } from './auth';
import { fetchJson } from '../utils/network';

const WEBSITE_BASE_URL = 'https://cinma.online';
const SYNC_STATE_KEY = 'library_last_sync_v1';

export const pullRemoteLibraryState = async (): Promise<boolean> => {
  try {
    const session = await getSession();
    if (!session) return false;
    const response = await fetchJson<{ myListIds?: string[]; progress?: UserLibrarySnapshot['progress'] }>(
      `${WEBSITE_BASE_URL}/api/mobile/library-state?userId=${encodeURIComponent(session.userId)}`
    );
    if (!response) return false;
    await applyRemoteUserLibrarySnapshot({
      myListIds: response.myListIds || [],
      progress: response.progress || {},
    });
    await AsyncStorage.setItem(SYNC_STATE_KEY, JSON.stringify({ lastPullAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
};

export const pushRemoteLibraryState = async (): Promise<boolean> => {
  try {
    const session = await getSession();
    if (!session) return false;
    const snapshot = await getUserLibrarySnapshot();
    await fetchJson<{ ok?: boolean }>(`${WEBSITE_BASE_URL}/api/mobile/library-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.userId,
        myListIds: snapshot.myListIds,
        progress: snapshot.progress,
      }),
    });
    await AsyncStorage.setItem(SYNC_STATE_KEY, JSON.stringify({ lastPushAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
};

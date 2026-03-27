import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getRecentAnalyticsEvents, trackEvent } from './analytics';
import { getUserLibrarySnapshot } from './userLibrary';

const RETENTION_KEY = 'retention_campaign_state_v1';
const notificationsEnabled = Constants.appOwnership !== 'expo' && Constants.executionEnvironment !== 'storeClient';

const resolveSegment = async () => {
  const [events, snapshot] = await Promise.all([
    getRecentAnalyticsEvents(180),
    getUserLibrarySnapshot(),
  ]);
  const watchEvents = events.filter((event) => event.name === 'playback_started').length;
  const progressCount = Object.keys(snapshot.progress || {}).length;
  if (watchEvents === 0 && progressCount === 0) return 'cold' as const;
  if (watchEvents <= 2) return 'at_risk' as const;
  return 'healthy' as const;
};

const scheduleNotification = async (title: string, body: string, hoursDelay: number) => {
  const Notifications = await import('expo-notifications');
  const triggerDate = new Date(Date.now() + 1000 * 60 * 60 * hoursDelay);
  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return { id, at: triggerDate.getTime() };
};

export const runRetentionAutomation = async () => {
  if (!notificationsEnabled) return false;
  const current = await AsyncStorage.getItem(RETENTION_KEY);
  if (current) return false;
  const segment = await resolveSegment();
  if (segment === 'healthy') return false;
  const payload =
    segment === 'at_risk'
      ? await scheduleNotification('We picked new titles for you', 'Jump back in and continue your favorites tonight.', 8)
      : await scheduleNotification('Your watchlist misses you', 'Return now and unlock fresh recommendations.', 12);
  await AsyncStorage.setItem(RETENTION_KEY, JSON.stringify({ ...payload, segment }));
  await trackEvent('retention_campaign_scheduled', {
    segment,
    notificationId: payload.id,
  });
  return true;
};

export const clearRetentionCampaign = async () => {
  if (!notificationsEnabled) return false;
  const Notifications = await import('expo-notifications');
  const raw = await AsyncStorage.getItem(RETENTION_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { id?: string };
    if (parsed.id) {
      await Notifications.cancelScheduledNotificationAsync(parsed.id);
    }
  } catch {}
  await AsyncStorage.removeItem(RETENTION_KEY);
  return true;
};

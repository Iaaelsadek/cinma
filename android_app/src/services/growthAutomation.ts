import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const WINBACK_KEY = 'winback_schedule_state_v1';
const notificationsEnabled = Constants.appOwnership !== 'expo' && Constants.executionEnvironment !== 'storeClient';

export const scheduleWinbackNotification = async () => {
  if (!notificationsEnabled) return false;
  const Notifications = await import('expo-notifications');
  const existing = await AsyncStorage.getItem(WINBACK_KEY);
  if (existing) return false;
  const triggerDate = new Date(Date.now() + 1000 * 60 * 60 * 18);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New releases waiting for you',
      body: 'Come back and continue watching with your personalized picks.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  await AsyncStorage.setItem(WINBACK_KEY, JSON.stringify({ id, at: triggerDate.getTime() }));
  return true;
};

export const clearWinbackNotification = async () => {
  if (!notificationsEnabled) return false;
  const Notifications = await import('expo-notifications');
  const raw = await AsyncStorage.getItem(WINBACK_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { id?: string };
    if (parsed.id) {
      await Notifications.cancelScheduledNotificationAsync(parsed.id);
    }
  } catch {}
  await AsyncStorage.removeItem(WINBACK_KEY);
  return true;
};

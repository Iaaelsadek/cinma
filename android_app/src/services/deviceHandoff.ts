import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSession } from './auth';
import { supabase } from './supabase';

type DeviceKind = 'mobile' | 'tv' | 'web';

export type ManagedDevice = {
  id: string;
  userId: string;
  name: string;
  platform: string;
  kind: DeviceKind;
  lastSeenAt: string;
};

type LocalDeviceProfile = {
  id: string;
  name: string;
  platform: string;
  kind: DeviceKind;
};

export type HandoffPayload = {
  targetDeviceId: string;
  contentId: string;
  title: string;
  poster: string;
  streamUrl: string;
  positionSec: number;
};

export type IncomingHandoff = {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  contentId: string;
  title: string;
  poster: string;
  streamUrl: string;
  positionSec: number;
  createdAt: string;
};

const DEVICE_PROFILE_KEY = 'device_profile_v1';
const LOCAL_DEVICE_TABLE_KEY_PREFIX = 'local_device_table_';
const LOCAL_HANDOFF_KEY_PREFIX = 'local_handoff_queue_';

const createDeviceId = () => `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const getDefaultDeviceName = () => {
  const appName = Constants.expoConfig?.name || 'Cinema Online';
  const suffix = Platform.isTV ? 'TV' : Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Web';
  return `${appName} ${suffix}`;
};

const getKind = (): DeviceKind => {
  if (Platform.isTV) return 'tv';
  if (Platform.OS === 'web') return 'web';
  return 'mobile';
};

export const getCurrentDeviceProfile = async (): Promise<LocalDeviceProfile> => {
  const raw = await AsyncStorage.getItem(DEVICE_PROFILE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as LocalDeviceProfile;
      if (parsed.id && parsed.name) return parsed;
    } catch {}
  }
  const profile: LocalDeviceProfile = {
    id: createDeviceId(),
    name: getDefaultDeviceName(),
    platform: Platform.OS,
    kind: getKind(),
  };
  await AsyncStorage.setItem(DEVICE_PROFILE_KEY, JSON.stringify(profile));
  return profile;
};

const getLocalDeviceKey = (userId: string) => `${LOCAL_DEVICE_TABLE_KEY_PREFIX}${userId}`;

const getLocalHandoffKey = (deviceId: string) => `${LOCAL_HANDOFF_KEY_PREFIX}${deviceId}`;

const readLocalDevices = async (userId: string): Promise<ManagedDevice[]> => {
  const raw = await AsyncStorage.getItem(getLocalDeviceKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ManagedDevice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalDevices = async (userId: string, devices: ManagedDevice[]) => {
  await AsyncStorage.setItem(getLocalDeviceKey(userId), JSON.stringify(devices));
};

export const registerCurrentDevice = async (): Promise<ManagedDevice | null> => {
  const session = await getSession();
  if (!session) return null;
  const current = await getCurrentDeviceProfile();
  const now = new Date().toISOString();
  const payload = {
    id: current.id,
    user_id: session.userId,
    name: current.name,
    platform: current.platform,
    kind: current.kind,
    last_seen_at: now,
  };
  try {
    const { data, error } = await supabase.from('user_devices').upsert(payload).select().single();
    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      platform: data.platform,
      kind: data.kind,
      lastSeenAt: data.last_seen_at,
    };
  } catch {
    const local = await readLocalDevices(session.userId);
    const next: ManagedDevice = {
      id: current.id,
      userId: session.userId,
      name: current.name,
      platform: current.platform,
      kind: current.kind,
      lastSeenAt: now,
    };
    const merged = [next, ...local.filter((entry) => entry.id !== next.id)].slice(0, 20);
    await writeLocalDevices(session.userId, merged);
    return next;
  }
};

export const listUserDevices = async (): Promise<ManagedDevice[]> => {
  const session = await getSession();
  if (!session) return [];
  try {
    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', session.userId)
      .order('last_seen_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      platform: row.platform,
      kind: row.kind,
      lastSeenAt: row.last_seen_at,
    }));
  } catch {
    return readLocalDevices(session.userId);
  }
};

export const removeDevice = async (deviceId: string) => {
  const session = await getSession();
  if (!session) return false;
  try {
    const { error } = await supabase.from('user_devices').delete().eq('id', deviceId).eq('user_id', session.userId);
    if (error) throw error;
    return true;
  } catch {
    const local = await readLocalDevices(session.userId);
    await writeLocalDevices(
      session.userId,
      local.filter((entry) => entry.id !== deviceId)
    );
    return true;
  }
};

const mapIncoming = (row: any): IncomingHandoff => ({
  id: row.id,
  fromDeviceId: row.from_device_id,
  toDeviceId: row.target_device_id,
  contentId: row.content_id,
  title: row.title,
  poster: row.poster,
  streamUrl: row.stream_url,
  positionSec: row.position_sec || 0,
  createdAt: row.created_at,
});

export const sendHandoff = async (payload: HandoffPayload) => {
  const session = await getSession();
  if (!session) return false;
  const current = await registerCurrentDevice();
  if (!current) return false;
  const handoff = {
    user_id: session.userId,
    from_device_id: current.id,
    target_device_id: payload.targetDeviceId,
    content_id: payload.contentId,
    title: payload.title,
    poster: payload.poster,
    stream_url: payload.streamUrl,
    position_sec: Math.max(0, Math.floor(payload.positionSec)),
    status: 'pending',
  };
  try {
    const { error } = await supabase.from('playback_handoffs').insert(handoff);
    if (error) throw error;
    return true;
  } catch {
    const key = getLocalHandoffKey(payload.targetDeviceId);
    const raw = await AsyncStorage.getItem(key);
    const queue = raw ? ((JSON.parse(raw) as IncomingHandoff[]) || []) : [];
    queue.unshift({
      id: createDeviceId(),
      fromDeviceId: current.id,
      toDeviceId: payload.targetDeviceId,
      contentId: payload.contentId,
      title: payload.title,
      poster: payload.poster,
      streamUrl: payload.streamUrl,
      positionSec: Math.max(0, Math.floor(payload.positionSec)),
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(key, JSON.stringify(queue.slice(0, 15)));
    return true;
  }
};

export const pollPendingHandoff = async (): Promise<IncomingHandoff | null> => {
  const current = await getCurrentDeviceProfile();
  try {
    const { data, error } = await supabase
      .from('playback_handoffs')
      .select('*')
      .eq('target_device_id', current.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    await supabase.from('playback_handoffs').update({ status: 'accepted' }).eq('id', data.id);
    return mapIncoming(data);
  } catch {
    const key = getLocalHandoffKey(current.id);
    const raw = await AsyncStorage.getItem(key);
    const queue = raw ? ((JSON.parse(raw) as IncomingHandoff[]) || []) : [];
    if (queue.length === 0) return null;
    const [next, ...rest] = queue;
    await AsyncStorage.setItem(key, JSON.stringify(rest));
    return next;
  }
};

export const subscribeToIncomingHandoffs = async (onIncoming: (handoff: IncomingHandoff) => void) => {
  const current = await getCurrentDeviceProfile();
  try {
    const channel = supabase
      .channel(`handoff:${current.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'playback_handoffs',
          filter: `target_device_id=eq.${current.id}`,
        },
        async (payload: any) => {
          const handoff = mapIncoming(payload.new);
          onIncoming(handoff);
          await supabase.from('playback_handoffs').update({ status: 'accepted' }).eq('id', handoff.id);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
};

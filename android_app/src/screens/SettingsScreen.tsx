import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from '../services/auth';
import { trackEvent } from '../services/analytics';
import { scheduleWinbackNotification } from '../services/growthAutomation';
import { useAuth } from '../context/AuthContext';
import { listUserDevices, registerCurrentDevice, removeDevice } from '../services/deviceHandoff';
import { clearCache } from '../utils/cache';
import { invalidateCatalogCache } from '../services/liveCatalog';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { session, isGuest, exitGuestMode } = useAuth();
  const [devices, setDevices] = useState<Array<{ id: string; name: string; kind: string; lastSeenAt: string }>>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      if (session && !isGuest) {
        await registerCurrentDevice();
        const userDevices = await listUserDevices();
        setDevices(
          userDevices.map((entry) => ({
            id: entry.id,
            name: entry.name,
            kind: entry.kind,
            lastSeenAt: entry.lastSeenAt,
          }))
        );
      } else {
        setDevices([]);
      }
      const notifPref = await AsyncStorage.getItem('notifications_enabled');
      setNotificationsEnabled(notifPref !== 'false');
    };
    bootstrap();
  }, [session, isGuest]);

  const handleSignOut = async () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          await scheduleWinbackNotification();
          await trackEvent('winback_scheduled', { source: 'sign_out' });
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
        },
      },
    ]);
  };

  const handleRefreshDevices = async () => {
    if (!session || isGuest) return;
    setLoadingDevices(true);
    await registerCurrentDevice();
    const userDevices = await listUserDevices();
    setDevices(
      userDevices.map((entry) => ({
        id: entry.id,
        name: entry.name,
        kind: entry.kind,
        lastSeenAt: entry.lastSeenAt,
      }))
    );
    setLoadingDevices(false);
  };

  const handleClearCache = async () => {
    Alert.alert('مسح الكاش', 'سيتم إعادة تحميل المحتوى من الإنترنت. هل تريد المتابعة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'مسح',
        onPress: async () => {
          setClearingCache(true);
          await Promise.all([clearCache(), invalidateCatalogCache()]);
          setClearingCache(false);
          Alert.alert('تم', 'تم مسح الكاش بنجاح.');
        },
      },
    ]);
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notifications_enabled', value ? 'true' : 'false');
  };

  const kindLabel = (kind: string) => {
    if (kind === 'tv') return 'تلفاز';
    if (kind === 'mobile') return 'جوال';
    return 'ويب';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#040406', '#111827']} style={styles.background}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>الإعدادات</Text>

          {/* Account Info */}
          {session && !isGuest && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الحساب</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>البريد الإلكتروني</Text>
                <Text style={styles.infoValue}>{session.email || '—'}</Text>
              </View>
            </View>
          )}

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التفضيلات</Text>
            <View style={styles.preferenceRow}>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#374151', true: '#e50914' }}
                thumbColor="#fff"
              />
              <Text style={styles.preferenceLabel}>الإشعارات</Text>
            </View>
          </View>

          {/* Storage */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التخزين</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleClearCache}
              disabled={clearingCache}
            >
              <Text style={styles.secondaryText}>
                {clearingCache ? 'جاري المسح...' : 'مسح الكاش'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Devices */}
          {session && !isGuest && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>إدارة الأجهزة</Text>
              {devices.length === 0 && (
                <Text style={styles.emptyText}>لا توجد أجهزة مسجلة.</Text>
              )}
              {devices.map((device) => (
                <View key={device.id} style={styles.deviceCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceMeta}>
                      {kindLabel(device.kind)} • {new Date(device.lastSeenAt).toLocaleString('ar')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deviceRemove}
                    onPress={async () => {
                      await removeDevice(device.id);
                      await handleRefreshDevices();
                    }}
                  >
                    <Text style={styles.deviceRemoveText}>إزالة</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.secondaryButton} onPress={handleRefreshDevices}>
                <Text style={styles.secondaryText}>
                  {loadingDevices ? 'جاري التحديث...' : 'تحديث الأجهزة'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>عن التطبيق</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>الإصدار</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>المحتوى</Text>
              <Text style={styles.infoValue}>مجاني بالكامل</Text>
            </View>
          </View>

          {/* Auth Actions */}
          {session && !isGuest ? (
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>تسجيل الخروج</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.signInButton}
              onPress={async () => {
                await exitGuestMode();
                navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
              }}
            >
              <Text style={styles.signInText}>تسجيل الدخول</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1 },
  content: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 40 },
  pageTitle: {
    color: '#fff', fontSize: 30, fontWeight: '800',
    marginBottom: 24, textAlign: 'right',
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#9ca3af', fontSize: 13, fontWeight: '700',
    textAlign: 'right', marginBottom: 10, textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#1f2937',
  },
  infoLabel: { color: '#9ca3af', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  preferenceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111827', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1f2937',
  },
  preferenceLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#0f172a', borderRadius: 10,
    borderColor: '#334155', borderWidth: 1,
    paddingVertical: 12, alignItems: 'center',
  },
  secondaryText: { color: '#cbd5e1', fontWeight: '700' },
  emptyText: { color: '#6b7280', fontSize: 13, textAlign: 'right', marginBottom: 8 },
  deviceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#334155',
  },
  deviceName: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  deviceMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2, textAlign: 'right' },
  deviceRemove: {
    marginLeft: 8, backgroundColor: '#7f1d1d',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
  },
  deviceRemoveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  signOutButton: {
    marginTop: 8, backgroundColor: '#7f1d1d',
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  signOutText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  signInButton: {
    marginTop: 8, backgroundColor: '#e50914',
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  signInText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default SettingsScreen;

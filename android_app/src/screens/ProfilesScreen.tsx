import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList,
  ActivityIndicator, Alert, TextInput, Modal, TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Focusable } from '../components/Focusable';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { trackEvent } from '../services/analytics';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type Profile = {
  id: string;
  name: string;
  avatar: string;
  isKids: boolean;
};

const DEFAULT_PROFILES: Profile[] = [
  { id: 'default-1', name: 'أبي', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=Dad', isKids: false },
  { id: 'default-2', name: 'أمي', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=Mom', isKids: false },
  { id: 'default-3', name: 'أطفال', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=Kids', isKids: true },
];

const PROFILES_CACHE_KEY = 'user_profiles_v1';

const ProfilesScreen = () => {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [isKids, setIsKids] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      if (session) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.userId)
          .order('created_at');
        if (!error && data && data.length > 0) {
          const mapped: Profile[] = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            avatar: row.avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(row.name)}`,
            isKids: row.is_kids || false,
          }));
          setProfiles(mapped);
          await AsyncStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(mapped));
          return;
        }
      }
      // Fallback to local cache or defaults
      const cached = await AsyncStorage.getItem(PROFILES_CACHE_KEY);
      if (cached) {
        setProfiles(JSON.parse(cached));
      } else {
        setProfiles(DEFAULT_PROFILES);
      }
    } catch {
      setProfiles(DEFAULT_PROFILES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [session]);

  const handleSelectProfile = async (profile: Profile) => {
    try {
      await AsyncStorage.setItem('active_profile', JSON.stringify(profile));
      await trackEvent('profile_selected', {
        profileId: profile.id,
        profileName: profile.name,
        isKids: profile.isKids,
      });
    } catch (e) {
      console.error('Failed to save profile', e);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'HomeTab' } }],
    });
  };

  const handleAddProfile = async () => {
    if (!newName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الملف الشخصي');
      return;
    }
    setSaving(true);
    try {
      const avatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(newName.trim())}`;
      if (session) {
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: session.userId,
            name: newName.trim(),
            avatar,
            is_kids: isKids,
          })
          .select()
          .single();
        if (error) throw error;
        const newProfile: Profile = {
          id: data.id,
          name: data.name,
          avatar: data.avatar,
          isKids: data.is_kids,
        };
        setProfiles((prev) => [...prev, newProfile]);
      } else {
        const newProfile: Profile = {
          id: `local-${Date.now()}`,
          name: newName.trim(),
          avatar,
          isKids,
        };
        const updated = [...profiles, newProfile];
        setProfiles(updated);
        await AsyncStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(updated));
      }
      setNewName('');
      setIsKids(false);
      setAddModalVisible(false);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'تعذر إضافة الملف الشخصي');
    } finally {
      setSaving(false);
    }
  };

  const renderProfile = ({ item }: { item: Profile }) => (
    <Focusable
      style={styles.profileCard}
      focusedStyle={styles.profileFocused}
      onPress={() => handleSelectProfile(item)}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.isKids && (
          <View style={styles.kidsBadge}>
            <Text style={styles.kidsText}>أطفال</Text>
          </View>
        )}
      </View>
      <Text style={styles.profileName}>{item.name}</Text>
    </Focusable>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.background}>
        <Text style={styles.title}>من يشاهد؟</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#e50914" />
        ) : (
          <View style={styles.profilesGrid}>
            <FlatList
              data={profiles}
              renderItem={renderProfile}
              keyExtractor={(item) => item.id}
              horizontal
              contentContainerStyle={styles.listContent}
              showsHorizontalScrollIndicator={false}
            />
            <Focusable
              style={styles.addProfile}
              focusedStyle={styles.addProfileFocused}
              onPress={() => setAddModalVisible(true)}
            >
              <View style={styles.addIconContainer}>
                <Plus size={40} color="#888" />
              </View>
              <Text style={styles.addText}>إضافة ملف</Text>
            </Focusable>
          </View>
        )}
      </LinearGradient>

      {/* Add Profile Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ملف شخصي جديد</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="اسم الملف الشخصي"
              placeholderTextColor="#9ca3af"
              value={newName}
              onChangeText={setNewName}
              textAlign="right"
            />
            <TouchableOpacity
              style={[styles.kidsToggle, isKids && styles.kidsToggleActive]}
              onPress={() => setIsKids(!isKids)}
            >
              <Text style={styles.kidsToggleText}>
                {isKids ? '✓ ملف أطفال' : 'ملف أطفال'}
              </Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleAddProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>حفظ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { color: '#fff', fontSize: 32, fontWeight: '300', marginBottom: 50 },
  profilesGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  listContent: { alignItems: 'center', justifyContent: 'center' },
  profileCard: { alignItems: 'center', marginHorizontal: 15, padding: 10 },
  profileFocused: {
    transform: [{ scale: 1.1 }], borderColor: '#fff',
    borderWidth: 2, borderRadius: 10,
  },
  avatarContainer: {
    width: 100, height: 100, borderRadius: 10,
    marginBottom: 10, overflow: 'hidden', backgroundColor: '#333',
  },
  avatar: { width: '100%', height: '100%' },
  profileName: { color: '#888', fontSize: 16, marginTop: 5 },
  kidsBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#e50914', paddingHorizontal: 6, paddingVertical: 2,
    borderTopLeftRadius: 6,
  },
  kidsText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  addProfile: { alignItems: 'center', marginHorizontal: 15 },
  addProfileFocused: { transform: [{ scale: 1.1 }] },
  addIconContainer: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  addText: { color: '#888', fontSize: 16 },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#111827', borderRadius: 16,
    padding: 24, width: '85%',
  },
  modalTitle: {
    color: '#fff', fontSize: 20, fontWeight: '800',
    textAlign: 'right', marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#1f2937', color: '#fff', borderRadius: 10,
    paddingHorizontal: 14, height: 48, marginBottom: 16,
    borderWidth: 1, borderColor: '#374151',
  },
  kidsToggle: {
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#374151', marginBottom: 20,
  },
  kidsToggleActive: { backgroundColor: '#7f1d1d', borderColor: '#e50914' },
  kidsToggleText: { color: '#fff', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1, backgroundColor: '#1f2937', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  modalCancelText: { color: '#9ca3af', fontWeight: '700' },
  modalSave: {
    flex: 1, backgroundColor: '#e50914', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontWeight: '800' },
});

export default ProfilesScreen;

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Focusable } from '../components/Focusable';
import { ProgressBar } from '../components/ProgressBar';
import { NativeMediaItem } from '../services/nativeCatalog';
import { getMyListItems, getProgressRatio, toggleMyList } from '../services/userLibrary';
import { getLiveCatalogItems } from '../services/liveCatalog';
import { pushRemoteLibraryState } from '../services/librarySync';
import { useAuth } from '../context/AuthContext';

const MyListScreen = () => {
  const navigation = useNavigation<any>();
  const { session, isGuest, exitGuestMode } = useAuth();
  const [items, setItems] = useState<NativeMediaItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!session || isGuest) {
      setItems([]);
      return;
    }
    const all = await getLiveCatalogItems();
    const myList = await getMyListItems(all);
    setItems(myList);

    // Load progress for each item
    const entries = await Promise.all(
      myList.map(async (item) => {
        const ratio = await getProgressRatio(item.id);
        return [item.id, ratio] as [string, number];
      })
    );
    setProgressMap(Object.fromEntries(entries));
  }, [session, isGuest]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050509', '#111827']} style={styles.background}>
        <Text style={styles.title}>قائمتي</Text>

        {!session || isGuest ? (
          <View style={styles.guestBox}>
            <Text style={styles.empty}>يجب تسجيل الدخول لاستخدام قائمة المفضلة.</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={async () => {
                await exitGuestMode();
                navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
              }}
            >
              <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>لا توجد عناصر بعد. أضف من الصفحة الرئيسية.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const progress = progressMap[item.id] ?? 0;
              return (
                <Focusable
                  style={styles.row}
                  focusedStyle={styles.rowFocused}
                  onPress={() => navigation.navigate('ContentDetail', { item })}
                >
                  <View style={styles.posterWrap}>
                    <Image source={{ uri: item.poster }} style={styles.poster} />
                    {progress > 0 && (
                      <View style={styles.progressWrap}>
                        <ProgressBar ratio={progress} />
                      </View>
                    )}
                  </View>
                  <View style={styles.meta}>
                    <Text style={styles.name}>{item.title}</Text>
                    {item.year && <Text style={styles.year}>{item.year}</Text>}
                    {progress > 0 && (
                      <Text style={styles.progressText}>
                        {Math.round(progress * 100)}% مشاهدة
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={async () => {
                        await toggleMyList(item.id);
                        await load();
                        await pushRemoteLibraryState();
                      }}
                    >
                      <Text style={styles.remove}>إزالة من القائمة</Text>
                    </TouchableOpacity>
                  </View>
                </Focusable>
              );
            }}
          />
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1, paddingTop: 46, paddingHorizontal: 16 },
  title: {
    color: '#fff', fontSize: 28, fontWeight: '800',
    marginBottom: 16, textAlign: 'right',
  },
  empty: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 20 },
  guestBox: { marginTop: 16, gap: 12, alignItems: 'center' },
  loginButton: {
    backgroundColor: '#dc2626', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  loginButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  list: { paddingBottom: 110 },
  row: {
    flexDirection: 'row', backgroundColor: '#111827',
    borderRadius: 12, marginBottom: 12, overflow: 'hidden',
  },
  rowFocused: { borderColor: '#fff', borderWidth: 2 },
  posterWrap: { width: 86, height: 120, position: 'relative' },
  poster: { width: 86, height: 120, backgroundColor: '#1f2937' },
  progressWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  meta: {
    flex: 1, padding: 12,
    justifyContent: 'space-between', alignItems: 'flex-end',
  },
  name: {
    color: '#fff', fontSize: 15, fontWeight: '700',
    textAlign: 'right', width: '100%',
  },
  year: { color: '#9ca3af', fontSize: 12, textAlign: 'right', width: '100%' },
  progressText: {
    color: '#60a5fa', fontSize: 12,
    textAlign: 'right', width: '100%',
  },
  remove: {
    color: '#f87171', fontSize: 13, fontWeight: '700',
    textAlign: 'right', width: '100%',
  },
});

export default MyListScreen;

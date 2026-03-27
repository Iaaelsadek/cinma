import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  Image, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { Focusable } from '../components/Focusable';
import { ProgressBar } from '../components/ProgressBar';
import { OfflineBanner } from '../components/OfflineBanner';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeCategoryRow, NativeMediaItem } from '../services/nativeCatalog';
import { trackEvent } from '../services/analytics';
import { toggleMyList } from '../services/userLibrary';
import { pushRemoteLibraryState } from '../services/librarySync';
import { useAuth } from '../context/AuthContext';
import { useHomeData } from '../hooks/useHomeData';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { getProgressRatio } from '../services/userLibrary';
import { useEffect, useState } from 'react';

const POSTER_WIDTH = 145;
const POSTER_HEIGHT = 220;

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { session, isGuest } = useAuth();
  const { rows, myListIds, loading, error, loadData, refreshMyListIds } = useHomeData();
  const { isOnline } = useNetworkStatus();
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  // Load progress ratios for all items
  useEffect(() => {
    const loadProgress = async () => {
      const continueRow = rows.find((r) => r.id === 'continue-watching');
      if (!continueRow) return;
      const entries = await Promise.all(
        continueRow.items.map(async (item) => {
          const ratio = await getProgressRatio(item.id);
          return [item.id, ratio] as [string, number];
        })
      );
      setProgressMap(Object.fromEntries(entries));
    };
    loadProgress();
  }, [rows]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh on focus (uses cache, no double-fetch)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if data is already loaded (not initial load)
      if (!loading) {
        refreshMyListIds();
      }
    }, [loading, refreshMyListIds])
  );

  const openContent = (item: NativeMediaItem) => {
    trackEvent('content_tapped', { contentId: item.id, title: item.title });
    navigation.navigate('ContentDetail', { item });
  };

  const handleToggleMyList = async (itemId: string) => {
    if (!session || isGuest) {
      Alert.alert('تسجيل الدخول مطلوب', 'ميزة قائمتي متاحة فقط للمستخدمين المسجلين.');
      return;
    }
    await toggleMyList(itemId);
    await refreshMyListIds();
    await pushRemoteLibraryState();
  };

  const renderContentRow = (row: NativeCategoryRow) => {
    if (!row.items || row.items.length === 0) return null;
    return (
      <View style={styles.sectionContainer} key={row.id}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => navigation.navigate('Category', { rowId: row.id, title: row.title, initialItems: row.items })}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionArrow}>‹</Text>
          <Text style={styles.sectionTitle}>{row.title}</Text>
        </TouchableOpacity>
        <FlatList
          data={row.items}
          horizontal
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.rowContent}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: POSTER_WIDTH + 12,
            offset: (POSTER_WIDTH + 12) * index,
            index,
          })}
          renderItem={({ item }) => {
            const isInList = myListIds.includes(item.id);
            const progress = progressMap[item.id] ?? 0;
            return (
              <View style={styles.posterCardWrap}>
                <Focusable
                  style={styles.posterCard}
                  focusedStyle={styles.posterFocused}
                  onPress={() => {
                    trackEvent('row_opened', { rowId: row.id, rowTitle: row.title });
                    openContent(item);
                  }}
                >
                  <Image source={{ uri: item.poster }} style={styles.posterImage} />
                  {/* معلومات أعلى الكارت: تقييم + سنة + تصنيف */}
                  <View style={styles.posterTopMeta}>
                    {!!item.rating && (
                      <Text style={styles.posterRating}>⭐{item.rating}</Text>
                    )}
                    {!!item.year && (
                      <Text style={styles.posterYear}>{item.year}</Text>
                    )}
                    {!!item.genre && (
                      <Text style={styles.posterGenre} numberOfLines={1}>{item.genre}</Text>
                    )}
                  </View>
                  {/* اسم العمل أسفل الكارت */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.95)']}
                    style={styles.posterFooter}
                  >
                    <Text numberOfLines={2} style={styles.posterTitle}>{item.title}</Text>
                  </LinearGradient>
                  {progress > 0 && (
                    <View style={styles.progressBarWrap}>
                      <ProgressBar ratio={progress} />
                    </View>
                  )}
                </Focusable>
                <TouchableOpacity
                  style={[styles.listButton, isInList && styles.listButtonActive]}
                  onPress={() => handleToggleMyList(item.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.listButtonText}>{isInList ? '✓' : '+'}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <OfflineBanner visible={!isOnline} />
      <LinearGradient colors={['#050508', '#101019', '#171725']} style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>اونلاين سينما</Text>
            <TouchableOpacity
              onPress={() => loadData(true)}
              style={styles.refreshButton}
              activeOpacity={0.7}
            >
              <Text style={styles.refreshText}>↻</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subTitle}>اضغط على أي ملصق للمشاهدة فوراً</Text>

          {loading && (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="large" color="#00e5ff" />
              <Text style={styles.loadingText}>جاري التحميل...</Text>
            </View>
          )}

          {!loading && error && (
            <View style={styles.errorSection}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadData(true)}>
                <Text style={styles.retryText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && rows.map(renderContentRow)}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1, paddingTop: 46 },
  scrollContent: { paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  headerTitle: { fontSize: 30, fontWeight: '800', color: '#fff' },
  refreshButton: { padding: 8 },
  refreshText: { color: '#9ca3af', fontSize: 22 },
  subTitle: { fontSize: 14, color: '#a5a5b0', marginBottom: 24, paddingHorizontal: 20 },
  sectionContainer: { width: '100%', marginBottom: 22, paddingLeft: 20 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingRight: 20, marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'right',
  },
  sectionArrow: {
    color: '#00e5ff', fontSize: 22, fontWeight: '300', marginLeft: 14,
    textShadowColor: '#00e5ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  rowContent: { paddingRight: 20 },
  posterCardWrap: { marginRight: 12 },
  posterCard: {
    width: POSTER_WIDTH, height: POSTER_HEIGHT,
    borderRadius: 8, overflow: 'hidden', backgroundColor: '#20202b',
  },
  posterFocused: { transform: [{ scale: 1.03 }], borderColor: '#ffffff', borderWidth: 2 },
  posterImage: { width: '100%', height: '100%' },
  posterFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 6, paddingVertical: 8, paddingTop: 20,
  },
  posterTitle: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'left', lineHeight: 15 },  posterTopMeta: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap',
  },
  posterRating: {
    color: '#fbbf24', fontSize: 9, fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  posterYear: {
    color: '#fff', fontSize: 9, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  posterGenre: {
    color: '#00e5ff', fontSize: 9, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 2, maxWidth: 70,
  },
  progressBarWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  listButton: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: '#d1d5db',
  },
  listButtonActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  listButtonText: { color: '#fff', fontWeight: '800', fontSize: 14, lineHeight: 16 },
  loadingSection: { alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  loadingText: { color: '#9ca3af', marginTop: 8, fontSize: 13 },
  errorSection: { alignItems: 'center', padding: 24 },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#1f2937', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});

export default HomeScreen;

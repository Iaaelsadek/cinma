import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Image, FlatList,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeMediaItem } from '../services/nativeCatalog';
import { fetchDbFiltered } from '../services/dbCatalog';
import { supabase } from '../services/supabase';
import { HomeContentItem } from '../services/types';

// ── Languages ────────────────────────────────────
const ORIGINS = [
  { key: 'ar', label: 'عربي', flag: '🇸🇦' },
  { key: 'en', label: 'إنجليزي', flag: '🇺🇸' },
  { key: 'ko', label: 'كوري', flag: '🇰🇷' },
  { key: 'tr', label: 'تركي', flag: '🇹🇷' },
  { key: 'hi', label: 'هندي', flag: '🇮🇳' },
  { key: 'ja', label: 'ياباني', flag: '🇯🇵' },
  { key: 'fr', label: 'فرنسي', flag: '🇫🇷' },
  { key: 'es', label: 'إسباني', flag: '🇪🇸' },
  { key: 'zh', label: 'صيني', flag: '🇨🇳' },
  { key: 'de', label: 'ألماني', flag: '🇩🇪' },
];

const SORT_OPTIONS = [
  { key: 'popularity.desc', label: '🔥 الأكثر شهرة' },
  { key: 'vote_average.desc', label: '⭐ الأعلى تقييماً' },
  { key: 'release_date.desc', label: '🆕 الأحدث' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

const POSTER_W = 108;
const POSTER_H = 162;

const BrowseScreen = () => {
  const navigation = useNavigation<any>();

  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [items, setItems] = useState<NativeMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingGenres, setLoadingGenres] = useState(false);

  // جلب التصنيفات الحقيقية من قاعدة البيانات
  const fetchGenres = useCallback(async () => {
    setLoadingGenres(true);
    try {
      const table = mediaType === 'movie' ? 'movies' : 'tv_series';
      const { data } = await supabase
        .from(table)
        .select('genres')
        .eq('is_active', true)
        .limit(500);

      if (data) {
        const genreSet = new Set<string>();
        data.forEach((row: any) => {
          if (Array.isArray(row.genres)) {
            row.genres.forEach((g: string) => { if (g) genreSet.add(g); });
          } else if (typeof row.genres === 'string' && row.genres) {
            // قد تكون مخزنة كـ JSON string
            try {
              const parsed = JSON.parse(row.genres);
              if (Array.isArray(parsed)) parsed.forEach((g: string) => { if (g) genreSet.add(g); });
            } catch {
              genreSet.add(row.genres);
            }
          }
        });
        setGenres(Array.from(genreSet).sort());
      }
    } catch {}
    setLoadingGenres(false);
  }, [mediaType]);

  useEffect(() => {
    fetchGenres();
    setSelectedGenre(null);
  }, [mediaType]);

  const fetchItems = useCallback(async (p = 1, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const result = await fetchDbFiltered({
        mediaType,
        genre: selectedGenre ?? undefined,
        language: selectedOrigin ?? undefined,
        year: selectedYear ?? undefined,
        sortBy,
        page: p,
        limit: 21,
      });
      const mapped: NativeMediaItem[] = result.items.map((i: HomeContentItem) => ({
        ...i, streamUrl: '',
      }));
      setItems(prev => append ? [...prev, ...mapped] : mapped);
      setHasMore(result.hasMore);
      setPage(p);
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  }, [mediaType, selectedGenre, selectedOrigin, selectedYear, sortBy]);

  useEffect(() => { fetchItems(1); }, [mediaType, selectedGenre, selectedOrigin, selectedYear, sortBy]);

  const renderItem = ({ item }: { item: NativeMediaItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ContentDetail', { item })}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.poster || 'https://via.placeholder.com/108x162' }}
        style={styles.cardPoster}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.92)']}
        style={styles.cardGradient}
      />
      <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
      <View style={styles.cardMeta}>
        {!!item.rating && <Text style={styles.cardRating}>⭐{item.rating}</Text>}
        {!!item.year && <Text style={styles.cardYear}>{item.year}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050508', '#0d0d18']} style={StyleSheet.absoluteFill} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>استكشف</Text>
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, mediaType === 'movie' && styles.typeBtnActive]}
            onPress={() => setMediaType('movie')}
          >
            <Text style={[styles.typeTxt, mediaType === 'movie' && styles.typeTxtActive]}>🎬 أفلام</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, mediaType === 'tv' && styles.typeBtnActive]}
            onPress={() => setMediaType('tv')}
          >
            <Text style={[styles.typeTxt, mediaType === 'tv' && styles.typeTxtActive]}>📺 مسلسلات</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        numColumns={3}
        renderItem={renderItem}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasMore && !loadingMore) fetchItems(page + 1, true); }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore
          ? <ActivityIndicator color="#e50914" style={{ marginVertical: 20 }} />
          : null
        }
        ListEmptyComponent={loading ? null : (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>لا توجد نتائج</Text>
          </View>
        )}
        ListHeaderComponent={
          <View>
            {/* ── Sort ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
              {SORT_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.chip, sortBy === s.key && styles.chipActive]}
                  onPress={() => setSortBy(s.key)}
                >
                  <Text style={[styles.chipTxt, sortBy === s.key && styles.chipTxtActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Genres from DB ── */}
            <Text style={styles.filterLabel}>التصنيف</Text>
            {loadingGenres ? (
              <ActivityIndicator color="#00e5ff" style={{ marginVertical: 8 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
                <TouchableOpacity
                  style={[styles.chip, !selectedGenre && styles.chipActive]}
                  onPress={() => setSelectedGenre(null)}
                >
                  <Text style={[styles.chipTxt, !selectedGenre && styles.chipTxtActive]}>الكل</Text>
                </TouchableOpacity>
                {genres.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, selectedGenre === g && styles.chipActive]}
                    onPress={() => setSelectedGenre(selectedGenre === g ? null : g)}
                  >
                    <Text style={[styles.chipTxt, selectedGenre === g && styles.chipTxtActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* ── Language ── */}
            <Text style={styles.filterLabel}>اللغة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
              <TouchableOpacity
                style={[styles.chip, !selectedOrigin && styles.chipActive]}
                onPress={() => setSelectedOrigin(null)}
              >
                <Text style={[styles.chipTxt, !selectedOrigin && styles.chipTxtActive]}>الكل</Text>
              </TouchableOpacity>
              {ORIGINS.map(o => (
                <TouchableOpacity
                  key={o.key}
                  style={[styles.chip, selectedOrigin === o.key && styles.chipActive]}
                  onPress={() => setSelectedOrigin(selectedOrigin === o.key ? null : o.key)}
                >
                  <Text style={[styles.chipTxt, selectedOrigin === o.key && styles.chipTxtActive]}>
                    {o.flag} {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Year ── */}
            <Text style={styles.filterLabel}>السنة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
              <TouchableOpacity
                style={[styles.chip, !selectedYear && styles.chipActive]}
                onPress={() => setSelectedYear(null)}
              >
                <Text style={[styles.chipTxt, !selectedYear && styles.chipTxtActive]}>الكل</Text>
              </TouchableOpacity>
              {YEARS.map(y => (
                <TouchableOpacity
                  key={y}
                  style={[styles.chip, selectedYear === y && styles.chipActive]}
                  onPress={() => setSelectedYear(selectedYear === y ? null : y)}
                >
                  <Text style={[styles.chipTxt, selectedYear === y && styles.chipTxtActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#00e5ff" />
              </View>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12,
  },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  typeToggle: { flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 3 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  typeBtnActive: { backgroundColor: '#e50914' },
  typeTxt: { color: '#6b7280', fontSize: 12, fontWeight: '700' },
  typeTxtActive: { color: '#fff' },
  filterLabel: {
    color: '#9ca3af', fontSize: 12, fontWeight: '700',
    paddingHorizontal: 16, marginTop: 12, marginBottom: 6, textAlign: 'right',
  },
  filterRow: { marginBottom: 2 },
  filterContent: { paddingHorizontal: 14, gap: 6 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(0,229,255,0.15)', borderColor: '#00e5ff',
  },
  chipTxt: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  chipTxtActive: { color: '#00e5ff', fontWeight: '700' },
  grid: { paddingHorizontal: 10, paddingBottom: 100, paddingTop: 12 },
  card: {
    flex: 1, margin: 4, height: POSTER_H,
    borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    maxWidth: POSTER_W + 8,
  },
  cardPoster: { width: '100%', height: '100%' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 75 },
  cardTitle: {
    position: 'absolute', bottom: 22, left: 5, right: 5,
    color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'right',
  },
  cardMeta: {
    position: 'absolute', bottom: 5, left: 5, right: 5,
    flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end',
  },
  cardRating: { color: '#fbbf24', fontSize: 9, fontWeight: '800' },
  cardYear: {
    color: '#d1d5db', fontSize: 9,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  loadingWrap: { alignItems: 'center', paddingVertical: 30 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTxt: { color: '#6b7280', fontSize: 15 },
});

export default BrowseScreen;

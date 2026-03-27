import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeMediaItem } from '../services/nativeCatalog';
import { fetchDbFiltered } from '../services/dbCatalog';
import { HomeContentItem } from '../services/types';

type RouteParams = {
  rowId: string;
  title: string;
  initialItems?: NativeMediaItem[];
};

const POSTER_W = 110;
const POSTER_H = 165;
const NUM_COLS = 3;

const CategoryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { rowId, title, initialItems } = (route.params || {}) as RouteParams;

  const [items, setItems] = useState<NativeMediaItem[]>(initialItems || []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(!initialItems || initialItems.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Derive mediaType and filters from rowId
  const mediaType: 'movie' | 'tv' = rowId.includes('series') || rowId.includes('tv') ? 'tv' : 'movie';

  const fetchPage = useCallback(async (p: number, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const result = await fetchDbFiltered({ mediaType, page: p, limit: 24 });
      const mapped: NativeMediaItem[] = result.items.map((i: HomeContentItem) => ({
        ...i,
        streamUrl: '',
      }));
      setItems(prev => append ? [...prev, ...mapped] : mapped);
      setHasMore(result.hasMore);
      setPage(p);
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  }, [mediaType]);

  useEffect(() => {
    if (!initialItems || initialItems.length === 0) {
      fetchPage(1);
    }
  }, []);

  const renderItem = ({ item }: { item: NativeMediaItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ContentDetail', { item })}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.poster || 'https://via.placeholder.com/110x165/1a1a2e/ffffff?text=?' }}
        style={styles.poster}
      />
      {/* معلومات أعلى */}
      <View style={styles.cardTopMeta}>
        {!!item.rating && <Text style={styles.cardRating}>⭐{item.rating}</Text>}
        {!!item.year && <Text style={styles.cardYear}>{item.year}</Text>}
        {!!item.genre && <Text style={styles.cardGenre} numberOfLines={1}>{item.genre}</Text>}
      </View>
      {/* اسم أسفل */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={styles.gradient} />
      <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050508', '#0d0d18']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i, index) => `${i.id}-${index}`}
          numColumns={NUM_COLS}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onEndReached={() => { if (hasMore && !loadingMore) fetchPage(page + 1, true); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#e50914" style={{ marginVertical: 20 }} /> : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: '#6b7280', fontSize: 15 }}>لا يوجد محتوى</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  backTxt: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'center' },
  grid: { paddingHorizontal: 12, paddingBottom: 100 },
  card: {
    flex: 1, margin: 5, height: POSTER_H,
    borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#1f2937',
    maxWidth: POSTER_W + 10,
  },
  poster: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 65 },
  cardTitle: {
    position: 'absolute', bottom: 6, left: 5, right: 5,
    color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'left', lineHeight: 14,
  },
  cardTopMeta: {
    position: 'absolute', top: 5, left: 4,
    flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap',
  },
  cardRating: {
    color: '#fbbf24', fontSize: 8, fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1,
  },
  cardYear: {
    color: '#fff', fontSize: 8,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1,
  },
  cardGenre: {
    color: '#00e5ff', fontSize: 8, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, maxWidth: 55,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
});

export default CategoryScreen;

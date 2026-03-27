import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  FlatList, Image, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Focusable } from '../components/Focusable';
import { OfflineBanner } from '../components/OfflineBanner';
import { NativeMediaItem } from '../services/nativeCatalog';
import { getLiveCatalogItems } from '../services/liveCatalog';
import { rankSearchResults } from '../services/recommendation';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const CARD_WIDTH = '48%';
const CARD_HEIGHT = 210;

const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<NativeMediaItem[]>([]);
  const [rankedResults, setRankedResults] = useState<NativeMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    getLiveCatalogItems().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!query.trim()) {
        setRankedResults([]);
        return;
      }
      const ranked = await rankSearchResults(query, items);
      setRankedResults(ranked);
    };
    run();
  }, [query, items]);

  const filtered = useMemo(
    () => (query.trim() ? rankedResults : items),
    [query, items, rankedResults]
  );

  return (
    <View style={styles.container}>
      <OfflineBanner visible={!isOnline} />
      <LinearGradient colors={['#06060a', '#111827']} style={styles.background}>
        <Text style={styles.title}>بحث</Text>
        <TextInput
          style={styles.input}
          placeholder="ابحث عن الأفلام والمسلسلات..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          textAlign="right"
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00e5ff" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            numColumns={2}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              query.trim() ? (
                <Text style={styles.emptyText}>لا توجد نتائج لـ "{query}"</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Focusable
                style={styles.card}
                focusedStyle={styles.cardFocused}
                onPress={() => navigation.navigate('ContentDetail', { item })}
              >
                <Image source={{ uri: item.poster }} style={styles.poster} />
                <View style={styles.cardInfo}>
                  <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
                  {item.year && <Text style={styles.cardYear}>{item.year}</Text>}
                </View>
              </Focusable>
            )}
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
    marginBottom: 12, textAlign: 'right',
  },
  input: {
    backgroundColor: '#1f2937', borderRadius: 12,
    color: '#fff', paddingHorizontal: 14, height: 46,
    marginBottom: 18, borderWidth: 1, borderColor: '#374151',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 120 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: CARD_WIDTH, backgroundColor: '#111827',
    borderRadius: 10, overflow: 'hidden',
  },
  cardFocused: { borderColor: '#fff', borderWidth: 2, transform: [{ scale: 1.02 }] },
  poster: { width: '100%', height: CARD_HEIGHT, backgroundColor: '#1f2937' },
  cardInfo: { padding: 8 },
  cardTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cardYear: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  emptyText: {
    color: '#6b7280', textAlign: 'center',
    marginTop: 40, fontSize: 14,
  },
});

export default SearchScreen;

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  ActivityIndicator, Image, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Focusable } from '../components/Focusable';
import { Sparkles, Send } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchJson } from '../utils/network';

const WEBSITE_BASE_URL = 'https://cinma.online';

type RecommendationItem = {
  id: string;
  title: string;
  poster: string;
  match: string;
  streamUrl?: string;
};

const AiMoodScreen = () => {
  const navigation = useNavigation<any>();
  const [mood, setMood] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecommendations = async () => {
    if (!mood.trim()) return;
    setError('');
    setLoading(true);
    try {
      /**
       * Route through backend proxy to keep API keys server-side.
       * The backend handles Gemini + TMDB calls and returns mapped results.
       */
      const result = await fetchJson<{ items?: RecommendationItem[]; error?: string }>(
        `${WEBSITE_BASE_URL}/api/mobile/ai-mood`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mood: mood.trim() }),
        }
      );

      if (result.error) {
        setError(result.error);
        setRecommendations([]);
        return;
      }

      const items = result.items || [];
      setRecommendations(items);
      if (items.length === 0) {
        setError('لم يتم العثور على نتائج لهذا المزاج. جرب عبارة أخرى.');
      }
    } catch {
      setError('تعذر الحصول على توصيات. تحقق من اتصالك وحاول مجدداً.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: RecommendationItem }) => (
    <Focusable
      style={styles.card}
      focusedStyle={styles.cardFocused}
      onPress={() => {
        if (item.streamUrl) {
          navigation.navigate('ContentDetail', {
            item: {
              id: item.id,
              title: item.title,
              poster: item.poster,
              streamUrl: item.streamUrl,
            },
          });
        }
      }}
    >
      <Image source={{ uri: item.poster }} style={styles.poster} />
      <View style={styles.matchBadge}>
        <Text style={styles.matchText}>{item.match} تطابق</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
    </Focusable>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1e1e2f', '#0f0c29']} style={styles.background}>
        <View style={styles.header}>
          <Sparkles size={28} color="#ffd700" />
          <Text style={styles.title}>توصيات بالذكاء الاصطناعي</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="كيف مزاجك؟ (مثال: أريد فيلم مضحك)"
            placeholderTextColor="#888"
            value={mood}
            onChangeText={setMood}
            onSubmitEditing={fetchRecommendations}
            textAlign="right"
          />
          <TouchableOpacity onPress={fetchRecommendations} style={styles.sendButton} activeOpacity={0.8}>
            <Send size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffd700" />
            <Text style={styles.loadingText}>الذكاء الاصطناعي يفكر...</Text>
          </View>
        ) : (
          <FlatList
            data={recommendations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            horizontal
            contentContainerStyle={styles.listContent}
            showsHorizontalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {error || 'أخبرني عن مزاجك لأقترح عليك محتوى مناسباً'}
              </Text>
            }
          />
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1, padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 10 },
  title: { fontSize: 22, color: '#fff', fontWeight: '800' },
  inputContainer: {
    flexDirection: 'row', backgroundColor: '#1f2937',
    borderRadius: 12, paddingHorizontal: 14,
    alignItems: 'center', marginBottom: 28,
    borderWidth: 1, borderColor: '#374151',
  },
  input: { flex: 1, height: 50, color: '#fff', fontSize: 15 },
  sendButton: {
    padding: 10, backgroundColor: '#e50914',
    borderRadius: 8, marginLeft: 8,
  },
  loadingContainer: { alignItems: 'center', marginTop: 60 },
  loadingText: { color: '#9ca3af', marginTop: 12, fontSize: 14 },
  listContent: { paddingRight: 20 },
  card: { width: 145, marginRight: 14 },
  cardFocused: {
    transform: [{ scale: 1.05 }],
    borderColor: '#ffd700', borderWidth: 2, borderRadius: 10,
  },
  poster: { width: 145, height: 218, borderRadius: 8, backgroundColor: '#1f2937' },
  matchBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,229,255,0.9)',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5,
  },
  matchText: { color: '#000', fontSize: 10, fontWeight: '800' },
  cardTitle: {
    color: '#fff', marginTop: 8, fontSize: 13,
    fontWeight: '600', textAlign: 'right',
  },
  emptyText: {
    color: '#6b7280', textAlign: 'center',
    marginTop: 60, fontSize: 15, paddingHorizontal: 20,
  },
});

export default AiMoodScreen;

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeMediaItem } from '../services/nativeCatalog';
import { getMyListIds, getProgressRatio, toggleMyList } from '../services/userLibrary';
import { pushRemoteLibraryState } from '../services/librarySync';
import { trackEvent } from '../services/analytics';
import { useAuth } from '../context/AuthContext';
import { useMiniPlayer } from '../context/MiniPlayerContext';
import { fetchJson } from '../utils/network';

type RouteParams = { item: NativeMediaItem };

// TMDB genre map (Arabic)
const GENRES: Record<number, string> = {
  28: 'أكشن', 12: 'مغامرة', 16: 'رسوم متحركة', 35: 'كوميديا',
  80: 'جريمة', 99: 'وثائقي', 18: 'دراما', 10751: 'عائلي',
  14: 'خيال', 36: 'تاريخ', 27: 'رعب', 10402: 'موسيقى',
  9648: 'غموض', 10749: 'رومانسية', 878: 'خيال علمي',
  53: 'إثارة', 10752: 'حرب', 37: 'غرب أمريكي',
  10759: 'أكشن ومغامرة', 10762: 'أطفال', 10763: 'أخبار',
  10764: 'واقع', 10765: 'خيال علمي وفانتازيا', 10767: 'برامج حوارية',
  10768: 'حرب وسياسة',
};

type TmdbDetail = {
  overview?: string;
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  original_language?: string;
  production_countries?: Array<{ name: string }>;
  backdrop_path?: string | null;
  tagline?: string;
  spoken_languages?: Array<{ name: string }>;
};

const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w780';

const fetchTmdbDetail = async (id: string): Promise<TmdbDetail | null> => {
  if (!TMDB_KEY) return null;
  const match = id.match(/^(movie|tv)-(\d+)$/);
  if (!match) return null;
  const [, type, tmdbId] = match;
  try {
    return await fetchJson<TmdbDetail>(
      `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=ar-SA`
    );
  } catch { return null; }
};

const LANG_MAP: Record<string, string> = {
  ar: 'عربي', en: 'إنجليزي', ko: 'كوري', ja: 'ياباني',
  fr: 'فرنسي', es: 'إسباني', hi: 'هندي', tr: 'تركي',
  zh: 'صيني', de: 'ألماني', it: 'إيطالي',
};

const ContentDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { item } = (route.params || {}) as RouteParams;
  const { session, isGuest } = useAuth();
  const { miniPlayer, showMiniPlayer } = useMiniPlayer();

  const [isInList, setIsInList] = useState(false);
  const [progressRatio, setProgressRatio] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TmdbDetail | null>(null);

  useEffect(() => {
    const init = async () => {
      const [ids, ratio, tmdbDetail] = await Promise.all([
        getMyListIds(),
        getProgressRatio(item.id),
        fetchTmdbDetail(item.id),
      ]);
      setIsInList(ids.includes(item.id));
      setProgressRatio(ratio);
      setDetail(tmdbDetail);
      setLoading(false);
      trackEvent('content_tapped', { contentId: item.id, title: item.title });
    };
    init();
  }, [item.id]);

  const handlePlay = () => {
    // If mini player is active with same item, expand it
    if (miniPlayer && miniPlayer.item.id === item.id) {
      navigation.navigate('VideoPlayer', {
        item: miniPlayer.item,
        resumePositionSec: Math.floor(miniPlayer.positionMs / 1000),
        servers: miniPlayer.servers,
        initialStreamUrl: miniPlayer.streamUrl,
      });
      return;
    }
    navigation.navigate('VideoPlayer', { item });
  };

  const handleToggleList = async () => {
    if (!session || isGuest) {
      Alert.alert('تسجيل الدخول مطلوب', 'ميزة قائمتي متاحة فقط للمستخدمين المسجلين.');
      return;
    }
    await toggleMyList(item.id);
    const ids = await getMyListIds();
    setIsInList(ids.includes(item.id));
    await pushRemoteLibraryState();
  };

  if (!item) return (
    <View style={styles.container}>
      <Text style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>المحتوى غير متاح</Text>
    </View>
  );

  const hasProgress = progressRatio > 0.03 && progressRatio < 0.97;
  const isTV = item.id.startsWith('tv-');
  const overview = detail?.overview || item.description || '';
  const year = detail?.release_date?.slice(0, 4) || detail?.first_air_date?.slice(0, 4) || item.year?.toString() || '';
  const rating = detail?.vote_average ? detail.vote_average.toFixed(1) : item.rating?.toString() || '';
  const genres = detail?.genres?.map(g => GENRES[g.id] || g.name).filter(Boolean) || [];
  const runtime = detail?.runtime ? `${detail.runtime} دقيقة` : '';
  const seasons = detail?.number_of_seasons ? `${detail.number_of_seasons} موسم` : '';
  const episodes = detail?.number_of_episodes ? `${detail.number_of_episodes} حلقة` : '';
  const lang = LANG_MAP[detail?.original_language || ''] || '';
  const country = detail?.production_countries?.[0]?.name || '';
  const backdrop = detail?.backdrop_path ? `${TMDB_IMG}${detail.backdrop_path}` : item.poster;
  const tagline = detail?.tagline || '';
  const isMiniActive = miniPlayer?.item?.id === item.id;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Hero */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: backdrop }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)', '#000']}
            style={styles.heroGradient}
          />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeTxt}>{isTV ? 'مسلسل' : 'فيلم'}</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Tagline */}
          {!!tagline && <Text style={styles.tagline}>"{tagline}"</Text>}

          {/* Rating + year row */}
          <View style={styles.metaRow}>
            {!!rating && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingTxt}>⭐ {rating}</Text>
              </View>
            )}
            {!!year && <Text style={styles.metaChip}>{year}</Text>}
            {!!runtime && <Text style={styles.metaChip}>{runtime}</Text>}
            {!!seasons && <Text style={styles.metaChip}>{seasons}</Text>}
            {!!episodes && <Text style={styles.metaChip}>{episodes}</Text>}
            {!!lang && <Text style={styles.metaChip}>{lang}</Text>}
            {!!country && <Text style={styles.metaChip}>{country}</Text>}
          </View>

          {/* Genres */}
          {genres.length > 0 && (
            <View style={styles.genreRow}>
              {genres.map((g) => (
                <View key={g} style={styles.genreBadge}>
                  <Text style={styles.genreTxt}>{g}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Progress */}
          {hasProgress && (
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressRatio * 100}%` as any }]} />
              </View>
              <Text style={styles.progressTxt}>شاهدت {Math.round(progressRatio * 100)}%</Text>
            </View>
          )}

          {/* Mini player active indicator */}
          {isMiniActive && (
            <View style={styles.miniActiveBanner}>
              <Text style={styles.miniActiveTxt}>▶ يُشغَّل الآن في المشغل المصغر</Text>
            </View>
          )}

          {/* Actions — play (2/3) + list (1/3) side by side */}
          {loading ? (
            <ActivityIndicator color="#e50914" style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.playButton} onPress={handlePlay} activeOpacity={0.9}>
                <Text style={styles.playButtonText}>
                  {isMiniActive ? '⛶ فتح المشغل' : hasProgress ? '▶ متابعة' : '▶ مشاهدة'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.listButton, isInList && styles.listButtonActive]}
                onPress={handleToggleList}
                activeOpacity={0.85}
              >
                <Text style={styles.listButtonText}>{isInList ? '✓' : '+'}</Text>
                <Text style={styles.listButtonSub}>{isInList ? 'قائمتي' : 'أضف'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Overview — below buttons */}
          {!!overview && (
            <Text style={styles.overview}>{overview}</Text>
          )}

          {/* Info table */}
          <View style={styles.infoTable}>
            {!!detail?.status && (
              <View style={styles.infoRow}>
                <Text style={styles.infoVal}>{detail.status}</Text>
                <Text style={styles.infoKey}>الحالة</Text>
              </View>
            )}
            {detail?.spoken_languages && detail.spoken_languages.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoVal}>{detail.spoken_languages.map(l => l.name).join('، ')}</Text>
                <Text style={styles.infoKey}>اللغات</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  heroContainer: { width: '100%', height: 400, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220 },
  backButton: {
    position: 'absolute', top: 50, left: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 22, width: 42, height: 42,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  typeBadge: {
    position: 'absolute', top: 50, right: 16,
    backgroundColor: 'rgba(229,9,20,0.85)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  infoContainer: { padding: 20, paddingTop: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'right', marginBottom: 6 },
  tagline: { color: '#9ca3af', fontSize: 13, fontStyle: 'italic', textAlign: 'right', marginBottom: 12 },
  metaRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' },
  ratingBadge: { backgroundColor: '#1f2937', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ratingTxt: { color: '#fbbf24', fontSize: 13, fontWeight: '800' },
  metaChip: {
    color: '#d1d5db', fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3,
  },
  genreRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  genreBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)',
  },
  genreTxt: { color: '#00e5ff', fontSize: 11, fontWeight: '700' },
  overview: { color: '#d1d5db', fontSize: 14, lineHeight: 23, textAlign: 'right', marginBottom: 18 },
  progressSection: { marginBottom: 16 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: '100%', backgroundColor: '#e50914', borderRadius: 2 },
  progressTxt: { color: '#9ca3af', fontSize: 12, textAlign: 'right' },
  miniActiveBanner: {
    backgroundColor: 'rgba(0,229,255,0.1)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)',
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14,
  },
  miniActiveTxt: { color: '#00e5ff', fontSize: 13, fontWeight: '700', textAlign: 'right' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'stretch' },
  playButton: {
    flex: 2,
    backgroundColor: '#e50914', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#e50914', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6,
  },
  playButtonText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  listButton: {
    flex: 1,
    backgroundColor: '#1f2937', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  listButtonActive: { backgroundColor: '#14532d', borderColor: '#16a34a' },
  listButtonText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  listButtonSub: { color: '#9ca3af', fontSize: 12, fontWeight: '600', marginTop: 2 },
  infoTable: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 16, gap: 10 },
  infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  infoKey: { color: '#6b7280', fontSize: 13 },
  infoVal: { color: '#e5e7eb', fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 8 },
});

export default ContentDetailScreen;

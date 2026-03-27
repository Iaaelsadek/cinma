import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity,
  ActivityIndicator, Modal, FlatList, Alert, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { WebView, type WebViewProps } from 'react-native-webview';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { NativeMediaItem } from '../services/nativeCatalog';
import { castMedia, getCastTargets } from '../services/casting';
import { useAuth } from '../context/AuthContext';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { fetchStreamSources } from '../services/supabase';
import { useMiniPlayer } from '../context/MiniPlayerContext';

type RouteParams = {
  item: NativeMediaItem;
  resumePositionSec?: number;
  servers?: Array<{ name: string; url: string; quality?: string }>;
  initialStreamUrl?: string;
};

const isEmbedUrl = (url: string): boolean => {
  if (!url) return false;
  return [
    'autoembed.co','vidsrc.net','vidsrc.io','vidsrc.cc','vidsrc.xyz',
    'vidsrc.me','vidsrc.vip','2embed.cc','2embed.skin','smashy.stream',
    '111movies.com','111movies.net','/embed/',
  ].some(d => url.includes(d));
};

// ─── Ad Neutralization JS ────────────────────────────────────────────────────
// Injected into every WebView page. Overrides window.open so popups fire
// invisibly (server registers the click) but the user never sees them.
const AD_NEUTRALIZER_JS = `
(function() {
  // 1. Override window.open — capture popup URL, load it in a hidden iframe, destroy after 2s
  var _origOpen = window.open;
  window.open = function(url, name, features) {
    try {
      if (url && typeof url === 'string') {
        var ghost = document.createElement('iframe');
        ghost.src = url;
        ghost.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-9999;top:-9999px;left:-9999px;';
        document.body.appendChild(ghost);
        setTimeout(function() {
          try { document.body.removeChild(ghost); } catch(e) {}
        }, 2000);
      }
    } catch(e) {}
    // Return a fake window object so the server thinks the popup opened
    return {
      closed: false, focus: function(){}, blur: function(){},
      close: function(){ this.closed = true; },
      location: { href: url || '' },
      document: { write: function(){}, close: function(){} }
    };
  };

  // 2. Block new-tab anchor clicks (<a target="_blank">)
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (el && el.tagName === 'A' && el.target === '_blank') {
      e.preventDefault();
      e.stopPropagation();
      // Fire a ghost fetch so the ad server registers the hit
      try {
        var href = el.href;
        if (href && !href.startsWith('javascript')) {
          var img = new Image();
          img.src = href;
          setTimeout(function(){ img.src = ''; }, 2000);
        }
      } catch(e2) {}
    }
  }, true);

  // 3. Suppress alert/confirm/prompt dialogs from ad scripts
  window.alert   = function(){};
  window.confirm = function(){ return true; };
  window.prompt  = function(){ return ''; };

  true; // required for injectedJavaScript
})();
`;

// ─── Ghost WebView — invisible popup absorber ────────────────────────────────
// Mounts when onOpenWindow fires, lives 2s, then self-destructs.
const GhostWebView = ({ url }: { url: string }) => {
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAlive(false), 2000);
    return () => clearTimeout(t);
  }, []);
  if (!alive) return null;
  return (
    <WebView
      source={{ uri: url }}
      style={styles.ghost}
      javaScriptEnabled
      injectedJavaScript={AD_NEUTRALIZER_JS}
      // Prevent the ghost from spawning more ghosts
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={() => true}
    />
  );
};

// ─── Main Player WebView ─────────────────────────────────────────────────────
const PlayerWebView = ({ uri }: { uri: string }) => {
  const [ghosts, setGhosts] = useState<Array<{ id: number; url: string }>>([]);
  const ghostCounter = useRef(0);

  const spawnGhost = useCallback((url: string) => {
    const id = ++ghostCounter.current;
    setGhosts(prev => [...prev, { id, url }]);
    // Auto-clean from list after 2.5s (ghost self-destructs at 2s)
    setTimeout(() => setGhosts(prev => prev.filter(g => g.id !== id)), 2500);
  }, []);

  return (
    <View style={styles.webViewContainer}>
      <WebView
        source={{ uri }}
        style={styles.video}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        // Inject ad neutralizer on every page load
        injectedJavaScript={AD_NEUTRALIZER_JS}
        injectedJavaScriptBeforeContentLoaded={AD_NEUTRALIZER_JS}
        // Allow multiple windows so onOpenWindow fires instead of blocking
        setSupportMultipleWindows={true}
        // Intercept new window requests → spawn invisible ghost
        onOpenWindow={(e) => {
          const targetUrl = (e.nativeEvent as any).targetUrl || '';
          if (targetUrl) spawnGhost(targetUrl);
        }}
        // Block navigation away from the player domain
        onShouldStartLoadWithRequest={(req) => {
          // Always allow the initial embed URL
          if (req.url === uri) return true;
          // Allow same-origin or known player domains
          const playerDomains = [
            'autoembed.co','vidsrc.','2embed.','smashy.stream',
            '111movies','googleapis.com','gstatic.com','jwplatform',
            'cloudflare','cdn.','player.','stream.','video.',
          ];
          const isPlayer = playerDomains.some(d => req.url.includes(d));
          if (isPlayer) return true;
          // Everything else (ad redirects) → spawn ghost + block
          if (req.url.startsWith('http')) spawnGhost(req.url);
          return false;
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
            <ActivityIndicator size="large" color="#e50914" />
            <Text style={styles.loadingText}>جاري تحميل السيرفر...</Text>
          </View>
        )}
      />
      {/* Invisible ghost WebViews — 1×1 pixel, off-screen */}
      {ghosts.map(g => <GhostWebView key={g.id} url={g.url} />)}
    </View>
  );
};

// ─── VideoPlayerScreen ───────────────────────────────────────────────────────
const VideoPlayerScreen = () => {
  const videoRef = useRef<Video | null>(null);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { session, isGuest } = useAuth();
  const { showMiniPlayer, miniPlayer, dismissMiniPlayer } = useMiniPlayer();
  const insets = useSafeAreaInsets();
  const { item, resumePositionSec: routeResumeSec, servers: routeServers, initialStreamUrl } =
    (route.params || {}) as RouteParams;

  const [resolvedResumeSec, setResolvedResumeSec] = useState<number>(routeResumeSec ?? 0);
  const resumeAppliedRef = useRef(false);

  useEffect(() => {
    if (miniPlayer && miniPlayer.item.id !== item?.id) dismissMiniPlayer();
  }, [item?.id]);

  const [casting, setCasting] = useState(false);
  const [castTargets, setCastTargets] = useState<Array<{ id: string; name: string; kind: string }>>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [castModalVisible, setCastModalVisible] = useState(false);
  const [servers, setServers] = useState<Array<{ name: string; url: string; quality?: string }>>([]);
  const [currentStreamUrl, setCurrentStreamUrl] = useState('');
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [loadingServers, setLoadingServers] = useState(false);

  const { currentSecondRef, onPlaybackUpdate } = useWatchProgress({
    contentId: item?.id ?? 'unknown',
    title: item?.title ?? 'unknown',
    resumePositionSec: resolvedResumeSec,
  });

  const minimizeToMiniPlayer = useCallback(() => {
    if (item && currentStreamUrl) {
      showMiniPlayer({ item, streamUrl: currentStreamUrl, positionMs: currentSecondRef.current * 1000, servers });
      videoRef.current?.pauseAsync().catch(() => {});
    }
    navigation.goBack();
  }, [item, currentStreamUrl, currentSecondRef, servers, showMiniPlayer, navigation]);

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { minimizeToMiniPlayer(); return true; });
    return () => sub.remove();
  }, [minimizeToMiniPlayer]));

  useEffect(() => {
    if (routeResumeSec && routeResumeSec > 0) { setResolvedResumeSec(routeResumeSec); return; }
    import('../services/userLibrary').then(({ getUserLibrarySnapshot }) => {
      getUserLibrarySnapshot().then((snapshot) => {
        const entry = snapshot.progress[item?.id ?? ''];
        if (entry && entry.positionSec > 0) {
          const ratio = entry.positionSec / Math.max(entry.durationSec, 1);
          if (ratio > 0.03 && ratio < 0.97) setResolvedResumeSec(entry.positionSec);
        }
      });
    });
  }, [item?.id, routeResumeSec]);

  useEffect(() => {
    if (!item?.id) return;
    if (routeServers && routeServers.length > 0) {
      setServers(routeServers);
      setCurrentStreamUrl(initialStreamUrl || routeServers[0].url);
      return;
    }
    setLoadingServers(true);
    fetchStreamSources(item.id).then((sources) => {
      setServers(sources);
      setCurrentStreamUrl(initialStreamUrl || (sources.length > 0 ? sources[0].url : item.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'));
      setLoadingServers(false);
    });
  }, [item?.id, item?.streamUrl, routeServers, initialStreamUrl]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    onPlaybackUpdate(status.isPlaying, status.isBuffering, status.positionMillis, status.durationMillis ?? 0, status.didJustFinish);
  };

  if (!currentStreamUrl) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={{ color: '#fff', marginTop: 12 }}>جاري تحميل المصادر...</Text>
      </View>
    );
  }

  const useWebView = isEmbedUrl(currentStreamUrl);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar hidden />

      {useWebView
        ? <PlayerWebView uri={currentStreamUrl} />
        : (
          <Video
            ref={videoRef}
            source={{ uri: currentStreamUrl }}
            style={styles.video}
            shouldPlay isLooping={false} useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            onLoad={async () => {
              if (!resumeAppliedRef.current && resolvedResumeSec > 0 && videoRef.current) {
                resumeAppliedRef.current = true;
                try { await videoRef.current.setPositionAsync(resolvedResumeSec * 1000); currentSecondRef.current = Math.floor(resolvedResumeSec); } catch {}
              }
            }}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
        )
      }

      {/* Top overlay */}
      <View style={styles.topOverlay}>
        <TouchableOpacity onPress={minimizeToMiniPlayer} style={styles.backButton} activeOpacity={0.85}>
          <Text style={styles.backText}>↙ تصغير</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.title}>{item?.title || 'قيد التشغيل'}</Text>
        <TouchableOpacity onPress={() => setServerModalVisible(true)} style={[styles.overlayButton, { backgroundColor: '#0f172a' }]} activeOpacity={0.85}>
          <Text style={styles.overlayButtonText}>السيرفر</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            if (!session || isGuest) { Alert.alert('تسجيل الدخول مطلوب', 'الإرسال للتلفاز يتطلب حساباً مسجلاً.'); return; }
            setLoadingTargets(true);
            const targets = await getCastTargets();
            setCastTargets(targets); setLoadingTargets(false); setCastModalVisible(true);
          }}
          style={styles.castButton} activeOpacity={0.85}
        >
          {/* Cast icon — WiFi-like waves with screen */}
          <View style={styles.castIcon}>
            <View style={styles.castScreen} />
            <View style={styles.castWave1} />
            <View style={styles.castWave2} />
            <View style={styles.castWave3} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Server Modal */}
      <Modal visible={serverModalVisible} animationType="slide" transparent onRequestClose={() => setServerModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر السيرفر</Text>
            {loadingServers ? <ActivityIndicator color="#fff" /> : servers.length === 0
              ? <Text style={styles.modalEmpty}>لا توجد سيرفرات متاحة.</Text>
              : <FlatList data={servers} keyExtractor={(s, i) => s.name + i}
                  renderItem={({ item: svr, index }) => (
                    <TouchableOpacity style={[styles.targetRow, currentStreamUrl === svr.url && styles.targetRowActive]}
                      onPress={() => { setCurrentStreamUrl(svr.url); resumeAppliedRef.current = false; setServerModalVisible(false); }}>
                      <Text style={styles.targetName}><Text style={styles.serverNum}>v{index + 1}  </Text>{svr.name}</Text>
                      <Text style={styles.targetMeta}>{svr.quality || 'Auto'} {isEmbedUrl(svr.url) ? '🌐' : '▶'}</Text>
                    </TouchableOpacity>
                  )} />
            }
            <TouchableOpacity onPress={() => setServerModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cast Modal */}
      <Modal visible={castModalVisible} animationType="slide" transparent onRequestClose={() => setCastModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر جهاز التلفاز</Text>
            {loadingTargets ? <ActivityIndicator color="#fff" /> : castTargets.length === 0
              ? <Text style={styles.modalEmpty}>لا يوجد تلفاز مسجل بنفس الحساب.</Text>
              : <FlatList data={castTargets} keyExtractor={e => e.id}
                  renderItem={({ item: target }) => (
                    <TouchableOpacity style={styles.targetRow} disabled={casting}
                      onPress={async () => {
                        setCasting(true);
                        const ok = await castMedia({ targetDeviceId: target.id, contentId: item?.id || 'unknown', title: item?.title || 'قيد التشغيل', poster: item?.poster || '', streamUrl: item?.streamUrl || '', positionSec: currentSecondRef.current });
                        setCasting(false); setCastModalVisible(false);
                        Alert.alert(ok ? 'تم الإرسال' : 'تعذر الإرسال', ok ? 'تم إرسال التشغيل إلى التلفاز بنجاح.' : 'تعذر مزامنة الجلسة.');
                      }}>
                      <Text style={styles.targetName}>{target.name}</Text>
                      <Text style={styles.targetMeta}>{target.kind === 'tv' ? 'تلفاز' : 'جهاز'}</Text>
                    </TouchableOpacity>
                  )} />
            }
            <TouchableOpacity onPress={() => setCastModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webViewContainer: { flex: 1 },
  video: { flex: 1, backgroundColor: '#000' },
  // Ghost WebView — 1×1 pixel, completely off-screen and invisible
  ghost: {
    position: 'absolute',
    width: 1, height: 1,
    top: -9999, left: -9999,
    opacity: 0,
  },
  loadingOverlay: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 13 },
  topOverlay: {
    position: 'absolute', top: 44, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10,
  },
  backButton: { backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  backText: { color: '#fff', fontWeight: '700' },
  title: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  overlayButton: { backgroundColor: 'rgba(220,38,38,0.85)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  overlayButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Cast button — icon only
  castButton: {
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
  },
  castIcon: { width: 22, height: 18, position: 'relative' },
  castScreen: {
    position: 'absolute', bottom: 0, left: 2, right: 2, height: 11,
    borderWidth: 2, borderColor: '#fff', borderRadius: 2,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  castWave1: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
    borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2,
    borderColor: '#fff', borderBottomWidth: 0,
  },
  castWave2: {
    position: 'absolute', bottom: 4, left: -3, right: -3, height: 5,
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
    borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)', borderBottomWidth: 0,
  },
  castWave3: {
    position: 'absolute', bottom: 9, left: -6, right: -6, height: 6,
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
    borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)', borderBottomWidth: 0,
  },
  serverNum: { color: '#00e5ff', fontWeight: '900', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#111827', borderTopLeftRadius: 16, borderTopRightRadius: 16, minHeight: 280, maxHeight: '70%', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  modalEmpty: { color: '#9ca3af', fontSize: 14, textAlign: 'right', marginTop: 8 },
  targetRow: { backgroundColor: '#1f2937', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  targetRowActive: { borderColor: '#00e5ff' },
  targetName: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  targetMeta: { color: '#9ca3af', fontSize: 12, marginTop: 2, textAlign: 'right' },
  closeButton: { marginTop: 10, backgroundColor: '#374151', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  closeButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default VideoPlayerScreen;

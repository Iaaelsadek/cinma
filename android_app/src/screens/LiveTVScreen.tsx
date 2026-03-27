import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { Focusable } from '../components/Focusable';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchLiveChannels } from '../services/supabase';
import { OfflineBanner } from '../components/OfflineBanner';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useMiniPlayer } from '../context/MiniPlayerContext';
import { NativeMediaItem } from '../services/nativeCatalog';

type Channel = {
  id: string;
  name: string;
  url: string;
  category: string;
};

const LiveTVScreen = () => {
  useKeepAwake();
  const videoRef = useRef<Video | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useNetworkStatus();
  const { miniPlayer, showMiniPlayer, dismissMiniPlayer } = useMiniPlayer();

  useEffect(() => {
    fetchLiveChannels().then((data) => {
      setChannels(data);
      if (data.length > 0) setCurrentChannel(data[0]);
      setLoading(false);
    });
  }, []);

  const switchChannel = (channel: Channel) => {
    // If mini player is active, replace it with this channel
    if (miniPlayer) {
      dismissMiniPlayer();
    }
    setCurrentChannel(channel);
    if (!Platform.isTV) setIsMenuVisible(false);
  };

  // When a channel starts playing, stop any active mini player
  useEffect(() => {
    if (currentChannel && miniPlayer) {
      dismissMiniPlayer();
    }
  }, [currentChannel?.id]);

  const renderChannelItem = ({ item }: { item: Channel }) => {
    const isActive = currentChannel?.id === item.id;
    return (
      <Focusable
        style={[styles.channelItem, isActive && styles.activeChannel]}
        focusedStyle={styles.focusedChannel}
        onPress={() => switchChannel(item)}
      >
        <Text style={styles.channelName}>{item.name}</Text>
        <Text style={styles.channelCategory}>{item.category}</Text>
      </Focusable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00e5ff" />
        <Text style={{ color: '#fff', marginTop: 10 }}>جاري تحميل القنوات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner visible={!isOnline} />

      {/* Video Player */}
      <View style={styles.videoContainer}>
        {currentChannel ? (
          <Video
            ref={videoRef}
            source={{ uri: currentChannel.url }}
            style={styles.video}
            shouldPlay
            isLooping={false}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={setStatus}
            useNativeControls={false}
          />
        ) : (
          <View style={styles.bufferingOverlay}>
            <Text style={styles.bufferingText}>لا توجد قنوات متاحة حالياً</Text>
          </View>
        )}

        {status?.isLoaded && status.isBuffering && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color="#00e5ff" />
            <Text style={styles.bufferingText}>جاري التحميل...</Text>
          </View>
        )}

        {/* Channel name overlay */}
        {currentChannel && (
          <View style={styles.channelNameOverlay}>
            <Text style={styles.channelNameOverlayText}>{currentChannel.name}</Text>
          </View>
        )}
      </View>

      {/* Channel Menu */}
      {isMenuVisible && (
        <LinearGradient
          colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.menuOverlay}
        >
          <Text style={styles.menuHeader}>القنوات المباشرة</Text>
          <FlatList
            data={channels}
            renderItem={renderChannelItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </LinearGradient>
      )}

      {/* Toggle button for mobile */}
      {!Platform.isTV && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.toggleButton} onPress={() => setIsMenuVisible(!isMenuVisible)}>
            <Text style={styles.toggleButtonText}>☰ القنوات</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', flexDirection: 'row' },
  videoContainer: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  bufferingText: { color: '#fff', marginTop: 10, fontSize: 14 },
  channelNameOverlay: {
    position: 'absolute', top: 40, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  channelNameOverlayText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  menuOverlay: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 280, paddingTop: 50, paddingHorizontal: 16, zIndex: 10,
  },
  menuHeader: {
    color: '#00e5ff', fontSize: 20, fontWeight: '800',
    marginBottom: 16, textAlign: 'right',
  },
  listContent: { paddingBottom: 20 },
  channelItem: {
    padding: 14, marginBottom: 8, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  activeChannel: {
    backgroundColor: 'rgba(0,229,255,0.2)',
    borderRightWidth: 4, borderRightColor: '#00e5ff',
  },
  focusedChannel: {
    borderColor: '#00e5ff', borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ scale: 1.02 }],
  },
  channelName: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'right' },
  channelCategory: { color: '#9ca3af', fontSize: 12, marginTop: 2, textAlign: 'right' },
  controlsContainer: { position: 'absolute', top: 40, left: 16 },
  toggleButton: {
    backgroundColor: 'rgba(0,0,0,0.7)', padding: 10,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleButtonText: { color: '#fff', fontWeight: '700' },
});

export default LiveTVScreen;

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  PanResponder, Animated, Dimensions,
} from "react-native";
import { Video, ResizeMode, Audio } from "expo-av";
import { WebView } from "react-native-webview";
import { useNavigation } from "@react-navigation/native";
import { useMiniPlayer } from "../context/MiniPlayerContext";

const { width: SW, height: SH } = Dimensions.get("window");
const PW = Math.round(SW * 0.5);
const PH = Math.round(PW * (9 / 16));

// حدود الحركة
const MIN_X = 8;
const MAX_X = SW - PW - 8;
const MIN_Y = 60;
const MAX_Y = SH - PH - 80;

// موضع البداية — أسفل يسار
const START_X = MIN_X;
const START_Y = MAX_Y;

// سلة المهملات — وسط أسفل
const TW = 56; const TH = 56;
const TX = (SW - TW) / 2;
const TY = SH - TH - 20;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const isEmbedUrl = (url: string) =>
  ['autoembed.co', 'vidsrc.', '2embed.', 'smashy.stream', '111movies', '/embed/'].some(d => url.includes(d));

const MiniPlayer = () => {
  const { miniPlayer, dismissMiniPlayer, updatePosition } = useMiniPlayer();
  const navigation = useNavigation<any>();
  const videoRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [overTrash, setOverTrash] = useState(false);
  const seekApplied = useRef(false);
  const currentPosMs = useRef(0);
  const controlsTimer = useRef<any>(null);

  // الموضع الحالي — نحتفظ بيه في ref منفصل عن Animated
  const posX = useRef(START_X);
  const posY = useRef(START_Y);
  const tx = useRef(new Animated.Value(START_X)).current;
  const ty = useRef(new Animated.Value(START_Y)).current;
  const trashScale = useRef(new Animated.Value(1)).current;

  const isEmbed = miniPlayer ? isEmbedUrl(miniPlayer.streamUrl) : false;

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false, staysActiveInBackground: true,
      playsInSilentModeIOS: true, shouldDuckAndroid: false, playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  const resetTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, []);

  const isOverTrash = (x: number, y: number) => {
    const cx = x + PW / 2;
    const cy = y + PH / 2;
    return cx > TX - 10 && cx < TX + TW + 10 && cy > TY - 10 && cy < TY + TH + 10;
  };

  // نحتفظ بموضع البداية عند كل gesture
  const dragStart = useRef({ x: START_X, y: START_Y });

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
    onPanResponderGrant: () => {
      // نسجل الموضع الحالي عند بداية السحب
      dragStart.current = { x: posX.current, y: posY.current };
      setIsDragging(true);
    },
    onPanResponderMove: (_, g) => {
      const nx = clamp(dragStart.current.x + g.dx, MIN_X, MAX_X);
      const ny = clamp(dragStart.current.y + g.dy, MIN_Y, MAX_Y);
      tx.setValue(nx);
      ty.setValue(ny);
      const over = isOverTrash(nx, ny);
      setOverTrash(over);
      Animated.spring(trashScale, { toValue: over ? 1.4 : 1, useNativeDriver: true }).start();
    },
    onPanResponderRelease: (_, g) => {
      const nx = clamp(dragStart.current.x + g.dx, MIN_X, MAX_X);
      const ny = clamp(dragStart.current.y + g.dy, MIN_Y, MAX_Y);
      if (isOverTrash(nx, ny)) {
        videoRef.current?.stopAsync?.().catch(() => {});
        dismissMiniPlayer();
      } else {
        posX.current = nx;
        posY.current = ny;
        tx.setValue(nx);
        ty.setValue(ny);
      }
      setIsDragging(false);
      setOverTrash(false);
      Animated.spring(trashScale, { toValue: 1, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: (_, g) => {
      const nx = clamp(dragStart.current.x + g.dx, MIN_X, MAX_X);
      const ny = clamp(dragStart.current.y + g.dy, MIN_Y, MAX_Y);
      posX.current = nx;
      posY.current = ny;
      tx.setValue(nx);
      ty.setValue(ny);
      setIsDragging(false);
      setOverTrash(false);
    },
  })).current;

  // إعادة الموضع لأسفل يسار عند كل عمل جديد
  useEffect(() => {
    if (!miniPlayer) return;
    seekApplied.current = false;
    setIsPlaying(true);
    posX.current = START_X;
    posY.current = START_Y;
    tx.setValue(START_X);
    ty.setValue(START_Y);
    resetTimer();
  }, [miniPlayer?.item?.id]);

  const handleStatus = useCallback((status: any) => {
    if (!status.isLoaded) return;
    currentPosMs.current = status.positionMillis ?? 0;
    updatePosition(status.positionMillis ?? 0);
    setIsPlaying(!!status.isPlaying);
  }, [updatePosition]);

  const handleLoad = useCallback(async () => {
    if (!seekApplied.current && miniPlayer && miniPlayer.positionMs > 0 && videoRef.current && !isEmbed) {
      seekApplied.current = true;
      try { await videoRef.current.setPositionAsync(miniPlayer.positionMs); } catch {}
    }
  }, [miniPlayer?.positionMs, isEmbed]);

  const expand = useCallback(() => {
    const sec = Math.floor(currentPosMs.current / 1000);
    if (!isEmbed) videoRef.current?.pauseAsync?.().catch(() => {});
    dismissMiniPlayer();
    navigation.navigate("VideoPlayer", {
      item: miniPlayer!.item,
      resumePositionSec: sec,
      servers: miniPlayer!.servers,
      initialStreamUrl: miniPlayer!.streamUrl,
    });
  }, [miniPlayer, dismissMiniPlayer, navigation, isEmbed]);

  if (!miniPlayer) return null;

  return (
    <>
      <Animated.View
        style={[s.card, { transform: [{ translateX: tx }, { translateY: ty }] }]}
        {...pan.panHandlers}
      >
        {isEmbed ? (
          <WebView
            source={{ uri: miniPlayer.streamUrl }}
            style={s.video}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            setSupportMultipleWindows={false}
            scrollEnabled={false}
          />
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: miniPlayer.streamUrl }}
            style={s.video}
            shouldPlay
            isLooping={false}
            resizeMode={ResizeMode.COVER}
            onLoad={handleLoad}
            onPlaybackStatusUpdate={handleStatus}
            isMuted={isMuted}
            progressUpdateIntervalMillis={1000}
          />
        )}

        <TouchableOpacity style={s.overlay_touch} activeOpacity={1} onPress={resetTimer}>
          {showControls && (
            <View style={s.overlay}>
              {/* صف علوي: إغلاق + عنوان */}
              <View style={s.row}>
                <TouchableOpacity style={s.btn} onPress={() => {
                  videoRef.current?.stopAsync?.().catch(() => {});
                  dismissMiniPlayer();
                }}>
                  <Text style={s.btxt}>✕</Text>
                </TouchableOpacity>
                <Text numberOfLines={1} style={s.title}>{miniPlayer.item.title}</Text>
              </View>

              {/* وسط: تشغيل/إيقاف */}
              <View style={s.center}>
                {!isEmbed ? (
                  <TouchableOpacity style={s.bigbtn} onPress={() => {
                    if (isPlaying) videoRef.current?.pauseAsync?.();
                    else videoRef.current?.playAsync?.();
                    resetTimer();
                  }}>
                    <Text style={s.bigtxt}>{isPlaying ? "⏸" : "▶"}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.bigbtn} onPress={expand}>
                    <Text style={s.bigtxt}>⛶</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* صف سفلي: صوت + توسيع */}
              <View style={s.row}>
                {!isEmbed ? (
                  <TouchableOpacity style={s.btn} onPress={() => { setIsMuted(m => !m); resetTimer(); }}>
                    <Text style={s.btxt}>{isMuted ? "�" : "🔊"}</Text>
                  </TouchableOpacity>
                ) : <View style={s.btn} />}
                <TouchableOpacity style={s.btn} onPress={expand}>
                  <Text style={s.btxt}>⛶</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* سلة المهملات */}
      {isDragging && (
        <Animated.View
          style={[s.trash, {
            transform: [{ scale: trashScale }],
            backgroundColor: overTrash ? "#ef4444" : "rgba(15,15,25,0.9)",
            borderColor: overTrash ? "#ef4444" : "rgba(255,255,255,0.2)",
          }]}
          pointerEvents="none"
        >
          <Text style={{ fontSize: 22 }}>🗑</Text>
        </Animated.View>
      )}
    </>
  );
};

const s = StyleSheet.create({
  card: {
    position: "absolute",
    width: PW, height: PH,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    zIndex: 99999,
  },
  video: { width: PW, height: PH, backgroundColor: "#000" },
  overlay_touch: { ...StyleSheet.absoluteFillObject },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  center: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  title: { flex: 1, color: "#fff", fontSize: 10, fontWeight: "700", textAlign: "left", marginLeft: 6 },
  btn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 13, width: 26, height: 26,
    alignItems: "center", justifyContent: "center",
  },
  btxt: { color: "#fff", fontSize: 11 },
  bigbtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20, width: 38, height: 38,
    alignItems: "center", justifyContent: "center",
  },
  bigtxt: { color: "#fff", fontSize: 16 },
  trash: {
    position: "absolute",
    left: TX, top: TY,
    width: TW, height: TH,
    borderRadius: TW / 2,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    zIndex: 99998, elevation: 19,
  },
});

export default MiniPlayer;

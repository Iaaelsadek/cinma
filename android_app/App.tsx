import React, { useEffect, useState } from 'react';
import 'react-native-gesture-handler';
import {
  NavigationContainer, DarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, I18nManager, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AuthScreen from './src/screens/AuthScreen';
import ProfilesScreen from './src/screens/ProfilesScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import ContentDetailScreen from './src/screens/ContentDetailScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import MainTabs from './src/screens/MainTabs';

import { configureAudioSession } from './src/services/backgroundTasks';
import { registerForPushNotificationsAsync } from './src/services/notifications';
import { flushAnalytics, trackEvent } from './src/services/analytics';
import { pullRemoteLibraryState } from './src/services/librarySync';
import { refreshFeatureFlags } from './src/services/featureFlags';
import { clearWinbackNotification } from './src/services/growthAutomation';
import { clearRetentionCampaign, runRetentionAutomation } from './src/services/retentionCampaign';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { MiniPlayerProvider } from './src/context/MiniPlayerContext';
import MiniPlayer from './src/components/MiniPlayer';
import { CinematicLoader } from './src/components/CinematicLoader';
import { Audio } from 'expo-av';
import {
  pollPendingHandoff,
  registerCurrentDevice,
  subscribeToIncomingHandoffs,
} from './src/services/deviceHandoff';
import { NativeMediaItem } from './src/services/nativeCatalog';
import { RootStackParamList } from './src/navigation/types';

const Stack = createStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const AppNavigator = () => {
  const { session, isGuest, isReady, refreshSession } = useAuth();

  // Handle deep links for auth callbacks
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      if (url.includes('auth/callback') || url.includes('access_token=')) {
        refreshSession();
      }
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('auth/callback') || url.includes('access_token=')) {
        refreshSession();
      }
    });
    return () => subscription.remove();
  }, [refreshSession]);

  // Device handoff setup
  useEffect(() => {
    if (!session) return;
    let unsubscribe = () => {};
    const setupHandoff = async () => {
      await registerCurrentDevice();
      const pending = await pollPendingHandoff();
      if (pending && navigationRef.isReady()) {
        const incomingItem: NativeMediaItem = {
          id: pending.contentId,
          title: pending.title,
          poster: pending.poster,
          streamUrl: pending.streamUrl,
        };
        navigationRef.navigate('VideoPlayer', {
          item: incomingItem,
          resumePositionSec: pending.positionSec,
        });
      }
      unsubscribe = await subscribeToIncomingHandoffs((handoff) => {
        if (!navigationRef.isReady()) return;
        const incomingItem: NativeMediaItem = {
          id: handoff.contentId,
          title: handoff.title,
          poster: handoff.poster,
          streamUrl: handoff.streamUrl,
        };
        navigationRef.navigate('VideoPlayer', {
          item: incomingItem,
          resumePositionSec: handoff.positionSec,
        });
      });
    };
    setupHandoff();
    return () => unsubscribe();
  }, [session]);

  // Retention / winback automation
  useEffect(() => {
    const syncPostAuthState = async () => {
      if (session) {
        await clearWinbackNotification();
        await clearRetentionCampaign();
      } else if (!isGuest) {
        await runRetentionAutomation();
      }
    };
    if (isReady) syncPostAuthState();
  }, [session, isGuest, isReady]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <CinematicLoader />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animationEnabled: true,
      }}
    >
      {session || isGuest ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Profiles" component={ProfilesScreen} />
          <Stack.Screen
            name="ContentDetail"
            component={ContentDetailScreen}
            options={{ presentation: 'card', animationEnabled: true }}
          />
          <Stack.Screen
            name="VideoPlayer"
            component={VideoPlayerScreen}
            options={{ presentation: 'modal', animationEnabled: true }}
          />
          <Stack.Screen
            name="Category"
            component={CategoryScreen}
            options={{ presentation: 'card', animationEnabled: true }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  const [bootReady, setBootReady] = useState(false);

  useEffect(() => {
    async function setupApp() {
      // Force RTL for Arabic
      if (!I18nManager.isRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      }

      if (Platform.isTV) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        await ScreenOrientation.unlockAsync();
      }

      await configureAudioSession();
      // Allow audio to continue in background (mini player)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
      await registerForPushNotificationsAsync();
      await trackEvent('app_open', { platform: Platform.OS, isTV: Platform.isTV });

      // Non-blocking background tasks
      Promise.all([
        refreshFeatureFlags(),
        pullRemoteLibraryState(),
        flushAnalytics(),
      ]).catch(() => {});

      setBootReady(true);
    }
    setupApp();
  }, []);

  if (!bootReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          <CinematicLoader />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/*
        AuthProvider wraps NavigationContainer so auth state is available
        before any navigation decisions are made.
      */}
      <AuthProvider>
        <MiniPlayerProvider>
          <NavigationContainer ref={navigationRef} theme={DarkTheme}>
            <StatusBar style="light" hidden={Platform.isTV} />
            <AppNavigator />
            <MiniPlayer />
          </NavigationContainer>
        </MiniPlayerProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

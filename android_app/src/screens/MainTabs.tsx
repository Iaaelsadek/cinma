import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './HomeScreen';
import SearchScreen from './SearchScreen';
import MyListScreen from './MyListScreen';
import LiveTVScreen from './LiveTVScreen';
import SettingsScreen from './SettingsScreen';
import AiMoodScreen from './AiMoodScreen';
import WatchPartyScreen from './WatchPartyScreen';
import BrowseScreen from './BrowseScreen';
import { getFeatureFlags } from '../services/featureFlags';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

const tabIcon = (emoji: string, focused: boolean) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

const MainTabs = () => {
  const { session, isGuest } = useAuth();
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [aiMoodEnabled, setAiMoodEnabled] = useState(false);
  const [watchPartyEnabled, setWatchPartyEnabled] = useState(false);

  useEffect(() => {
    getFeatureFlags().then((flags) => {
      setLiveEnabled(flags.liveTabEnabled);
      setAiMoodEnabled(flags.aiMoodEnabled);
      setWatchPartyEnabled(flags.watchPartyEnabled);
    });
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0b0b12',
          borderTopColor: '#1f2937',
          height: 66,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'الرئيسية', tabBarIcon: ({ focused }) => tabIcon('🏠', focused) }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{ title: 'بحث', tabBarIcon: ({ focused }) => tabIcon('🔍', focused) }}
      />
      <Tab.Screen
        name="BrowseTab"
        component={BrowseScreen}
        options={{ title: 'استكشف', tabBarIcon: ({ focused }) => tabIcon('🎬', focused) }}
      />
      {!!session && !isGuest && (
        <Tab.Screen
          name="MyListTab"
          component={MyListScreen}
          options={{ title: 'قائمتي', tabBarIcon: ({ focused }) => tabIcon('❤️', focused) }}
        />
      )}
      {liveEnabled && (
        <Tab.Screen
          name="LiveTab"
          component={LiveTVScreen}
          options={{ title: 'بث مباشر', tabBarIcon: ({ focused }) => tabIcon('📺', focused) }}
        />
      )}
      {aiMoodEnabled && (
        <Tab.Screen
          name="AiMoodTab"
          component={AiMoodScreen}
          options={{ title: 'AI', tabBarIcon: ({ focused }) => tabIcon('✨', focused) }}
        />
      )}
      {watchPartyEnabled && !!session && !isGuest && (
        <Tab.Screen
          name="WatchPartyTab"
          component={WatchPartyScreen}
          options={{ title: 'حفلة', tabBarIcon: ({ focused }) => tabIcon('🎉', focused) }}
        />
      )}
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'الإعدادات', tabBarIcon: ({ focused }) => tabIcon('⚙️', focused) }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;

import { NativeMediaItem } from '../services/nativeCatalog';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: { screen?: string } | undefined;
  Profiles: undefined;
  VideoPlayer: { item: NativeMediaItem; resumePositionSec?: number; servers?: Array<{ name: string; url: string; quality?: string }>; initialStreamUrl?: string };
  ContentDetail: { item: NativeMediaItem };
  Category: { rowId: string; title: string; initialItems?: NativeMediaItem[] };
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  MyListTab: undefined;
  LiveTab: undefined;
  SettingsTab: undefined;
};

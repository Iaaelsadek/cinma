// Global ambient types to ease TS compilation during refactor
declare type ReactNode = import('react').ReactNode;
declare type HTMLMotionProps<T> = import('framer-motion').HTMLMotionProps<T>;
declare type InputHTMLAttributes<T> = import('react').InputHTMLAttributes<T>;

// Define Media Types instead of any
declare interface Movie {
  id: number | string;
  title?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  release_date?: string;
  vote_average?: number;
  media_type?: 'movie';
  [key: string]: unknown;
}

declare interface TV {
  id: number | string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: 'tv';
  [key: string]: unknown;
}

declare interface Game {
  title: string;
  rating: number;
  release_date: string;
  category: string;
  description: string;
  poster_url: string;
  backdrop_url: string;
  download_url: string;
  screenshots: string[];
  [key: string]: unknown;
}

declare interface Software {
  title: string;
  platform: 'pc' | 'android' | 'apple' | 'terminal' | 'other' | string;
  poster_url: string;
  rating: number;
  version: string;
  size: string;
  description: string;
  download_url: string;
  [key: string]: unknown;
}

declare interface TmdbMedia {
  id: number;
  slug?: string;
  title?: string;
  name?: string;
  media_type?: 'movie' | 'tv' | string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  [key: string]: unknown;
}

declare interface RecommendationItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  media_type?: string;
  vote_average?: number;
  [key: string]: unknown;
}

declare interface SeriesDetailsProps {
  id: string | number;
  slug?: string;
}

declare type Profile = import('../lib/supabase').Profile;
declare type Role = 'user' | 'admin' | 'supervisor';
declare type LeaderboardEntry = import('../lib/supabase').LeaderboardEntry;
declare type UserAchievement = import('../lib/supabase').UserAchievement;
declare type QuranReciter = {
  id: string;
  name: string;
  arabic_name: string;
  style: string;
  image_url?: string;
};
declare const ImageIcon: import('lucide-react').LucideIcon;
declare const ActivityIcon: import('lucide-react').LucideIcon;
declare const LinkIcon: import('lucide-react').LucideIcon;
declare const UserIcon: import('lucide-react').LucideIcon;
declare type ToastType = 'success' | 'error' | 'info' | 'warning';
declare type ProfileType = Profile;
declare const useRQ: typeof import('@tanstack/react-query').useQuery;

declare type LogArgs = unknown[];
declare type Logger = {
  log: (...args: LogArgs) => void;
  error: (...args: LogArgs) => void;
  warn: (...args: LogArgs) => void;
  info: (...args: LogArgs) => void;
  debug: (...args: LogArgs) => void;
};
declare const logger: Logger;

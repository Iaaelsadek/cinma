export interface Game {
  title: string;
  rating: number;
  release_date: string;
  category: string;
  description: string;
  poster_url: string;
  backdrop_url: string;
  download_url: string;
  screenshots: string[];
}

export interface Software {
  title: string;
  platform: 'pc' | 'android' | 'apple' | 'terminal' | 'other' | string;
  poster_url: string;
  rating: number;
  version: string;
  size: string;
  description: string;
  download_url: string;
}

export interface TmdbMedia {
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
}

export interface RecommendationItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  media_type?: string;
  vote_average?: number;
}

export interface SeriesDetailsProps {
  id: string | number;
  slug?: string;
}

export interface Movie {
  id: number | string;
  title?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  overview_ar?: string;
  overview_en?: string;
  release_date?: string;
  vote_average?: number;
  media_type?: 'movie';
  ai_summary?: string | null;
  trailer_url?: string | null;
}

export interface TV {
  id: number | string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: 'tv';
}

export interface Profile {
  id: string;
  username?: string;
  avatar_url?: string;
}

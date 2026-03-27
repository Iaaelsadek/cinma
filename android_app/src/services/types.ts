export type MediaType = 'movie' | 'tv';

export type HomeContentItem = {
  id: string;
  tmdbId: number;
  title: string;
  poster: string;
  mediaType: MediaType;
  progress?: number;
  year?: number;
  rating?: number;
  genre?: string;
  servers?: Array<{ name: string; url: string; quality?: string }>;
};

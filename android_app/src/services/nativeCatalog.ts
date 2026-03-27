import { pickStream } from '../utils/streams';

export type NativeMediaItem = {
  id: string;
  title: string;
  poster: string;
  streamUrl: string;
  description?: string;
  year?: number;
  rating?: number;
  duration?: string;
  genre?: string;
  servers?: Array<{ name: string; url: string; quality?: string }>;
};

export type NativeCategoryRow = {
  id: string;
  title: string;
  items: NativeMediaItem[];
};

const poster = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/300/450`;

const createItems = (prefix: string, base: Array<{ title: string; year?: number; rating?: number }>): NativeMediaItem[] =>
  base.map((item, index) => ({
    id: `${prefix}-${index + 1}`,
    title: item.title,
    poster: poster(`${prefix}-${item.title}`),
    streamUrl: pickStream(index),
    year: item.year,
    rating: item.rating,
  }));

export const getNativeHomeRows = async (): Promise<NativeCategoryRow[]> => {
  const arabicMovies = createItems('arabic', [
    { title: 'الهيبة', year: 2017, rating: 8.2 },
    { title: 'الفيل الأزرق', year: 2014, rating: 7.8 },
    { title: 'كيرة والجن', year: 2022, rating: 7.5 },
    { title: 'أولاد رزق', year: 2015, rating: 7.9 },
    { title: 'الاختيار', year: 2020, rating: 8.5 },
    { title: 'موسى', year: 2023, rating: 7.6 },
  ]);

  const englishMovies = createItems('english', [
    { title: 'استهلال', year: 2010, rating: 8.8 },
    { title: 'بين النجوم', year: 2014, rating: 8.6 },
    { title: 'كثيب', year: 2021, rating: 8.0 },
    { title: 'جون ويك', year: 2014, rating: 7.4 },
    { title: 'توب غان: مافريك', year: 2022, rating: 8.3 },
    { title: 'الرجل الوطواط', year: 2022, rating: 7.8 },
  ]);

  const koreanDrama = createItems('korean', [
    { title: 'هبوط طارئ للحب', year: 2019, rating: 8.7 },
    { title: 'العفريت', year: 2016, rating: 8.9 },
    { title: 'فينتشنزو', year: 2021, rating: 8.8 },
    { title: 'اسمي', year: 2021, rating: 8.5 },
    { title: 'صف إتايوان', year: 2022, rating: 8.6 },
    { title: 'المجد', year: 2022, rating: 8.7 },
  ]);

  const indianMovies = createItems('indian', [
    { title: 'آر آر آر', year: 2022, rating: 7.9 },
    { title: 'باثان', year: 2023, rating: 5.8 },
    { title: 'جوان', year: 2023, rating: 6.5 },
    { title: 'ثلاثة بلهاء', year: 2009, rating: 8.4 },
    { title: 'دانجال', year: 2016, rating: 8.3 },
    { title: 'كي جي إف', year: 2022, rating: 8.2 },
  ]);

  const trending = createItems('trending', [
    { title: 'اختلال ضال', year: 2023, rating: 8.1 },
    { title: 'ذا لاست أوف أس', year: 2023, rating: 8.8 },
    { title: 'أوبنهايمر', year: 2023, rating: 8.9 },
    { title: 'آل التنين', year: 2022, rating: 8.5 },
    { title: 'وينزداي', year: 2022, rating: 8.1 },
    { title: 'شوغون', year: 2024, rating: 8.6 },
  ]);

  return [
    { id: 'arabic-movies', title: 'أفلام عربية', items: arabicMovies },
    { id: 'english-movies', title: 'أفلام أجنبية', items: englishMovies },
    { id: 'korean-drama', title: 'دراما كورية', items: koreanDrama },
    { id: 'indian-movies', title: 'أفلام هندية', items: indianMovies },
    { id: 'trending', title: 'الأكثر تداولاً', items: trending },
  ];
};

export const getAllNativeItems = async (): Promise<NativeMediaItem[]> => {
  const rows = await getNativeHomeRows();
  const map = new Map<string, NativeMediaItem>();
  rows.forEach((row) => {
    row.items.forEach((item) => {
      if (!map.has(item.id)) map.set(item.id, item);
    });
  });
  return Array.from(map.values());
};

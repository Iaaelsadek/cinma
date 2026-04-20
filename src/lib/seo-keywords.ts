/**
 * SEO Keywords Generator
 * Generates optimized keywords for movies, TV series, and pages
 */

// Genre translations (English to Arabic)
const GENRE_TRANSLATIONS: Record<string, string> = {
  'Action': 'أكشن',
  'Adventure': 'مغامرات',
  'Animation': 'رسوم متحركة',
  'Comedy': 'كوميدي',
  'Crime': 'جريمة',
  'Documentary': 'وثائقي',
  'Drama': 'دراما',
  'Family': 'عائلي',
  'Fantasy': 'خيال',
  'History': 'تاريخي',
  'Horror': 'رعب',
  'Music': 'موسيقي',
  'Mystery': 'غموض',
  'Romance': 'رومانسي',
  'Science Fiction': 'خيال علمي',
  'TV Movie': 'فيلم تلفزيوني',
  'Thriller': 'إثارة',
  'War': 'حرب',
  'Western': 'غربي',
  'Action & Adventure': 'أكشن ومغامرات',
  'Kids': 'أطفال',
  'News': 'أخبار',
  'Reality': 'واقعي',
  'Sci-Fi & Fantasy': 'خيال علمي',
  'Soap': 'مسلسل درامي',
  'Talk': 'حواري',
  'War & Politics': 'حرب وسياسة'
};

// Home page keywords
export const HOME_KEYWORDS = [
  'مشاهدة افلام',
  'افلام اون لاين',
  'مشاهدة مسلسلات',
  'افلام مترجمة',
  'مسلسلات اون لاين',
  'افلام عربية',
  'افلام اجنبية',
  'مشاهدة افلام مجانا',
  'افلام بجودة عالية',
  'افلام HD',
  'افلام 4K',
  'افلام 2024',
  'افلام 2025',
  'افلام 2026',
  'مسلسلات 2024',
  'احدث الافلام',
  'احدث المسلسلات',
  'سينما اون لاين',
  'موقع افلام',
  'موقع مسلسلات'
];

// Movies general keywords
export const MOVIES_GENERAL_KEYWORDS = [
  'افلام',
  'مشاهدة افلام',
  'افلام اون لاين',
  'افلام مترجمة',
  'افلام عربية',
  'افلام اجنبية',
  'افلام HD',
  'افلام بجودة عالية',
  'احدث الافلام'
];

// TV Series general keywords
export const SERIES_GENERAL_KEYWORDS = [
  'مسلسلات',
  'مشاهدة مسلسلات',
  'مسلسلات اون لاين',
  'مسلسلات مترجمة',
  'مسلسلات عربية',
  'مسلسلات اجنبية',
  'احدث المسلسلات'
];

interface Movie {
  title?: string;
  title_ar?: string;
  title_en?: string;
  original_title?: string;
  release_date?: string;
  genres?: Array<{ id: number; name: string }>;
  cast?: Array<{ name: string }>;
}

interface TVSeries {
  name?: string;
  name_ar?: string;
  name_en?: string;
  original_name?: string;
  first_air_date?: string;
  genres?: Array<{ id: number; name: string }>;
}

/**
 * Generate SEO keywords for a movie
 */
export function generateMovieKeywords(movie: Movie): string[] {
  const keywords: string[] = [];
  
  // 1. Movie title variations (Arabic)
  if (movie.title_ar) {
    keywords.push(
      movie.title_ar,
      `فيلم ${movie.title_ar}`,
      `مشاهدة فيلم ${movie.title_ar}`,
      `مشاهدة فيلم ${movie.title_ar} مترجم`,
      `مشاهدة فيلم ${movie.title_ar} كامل`,
      `مشاهدة فيلم ${movie.title_ar} اون لاين`,
      `مشاهدة فيلم ${movie.title_ar} بجودة عالية`,
      `مشاهدة فيلم ${movie.title_ar} HD`,
      `فيلم ${movie.title_ar} مترجم`,
      `فيلم ${movie.title_ar} كامل`,
      `فيلم ${movie.title_ar} اون لاين`,
      `تحميل فيلم ${movie.title_ar}`
    );
  }
  
  // 2. English title
  if (movie.title_en) {
    keywords.push(
      movie.title_en,
      `فيلم ${movie.title_en}`,
      `مشاهدة فيلم ${movie.title_en}`
    );
  }
  
  // 3. Original title (if different from English)
  if (movie.original_title && movie.original_title !== movie.title_en) {
    keywords.push(movie.original_title);
  }
  
  // 4. Release year
  if (movie.release_date) {
    const year = new Date(movie.release_date).getFullYear();
    keywords.push(
      year.toString(),
      `افلام ${year}`
    );
    
    if (movie.title_ar) {
      keywords.push(
        `فيلم ${movie.title_ar} ${year}`,
        `مشاهدة فيلم ${movie.title_ar} ${year}`
      );
    }
  }
  
  // 5. Genres
  if (movie.genres && movie.genres.length > 0) {
    movie.genres.forEach(genre => {
      const arabicGenre = GENRE_TRANSLATIONS[genre.name];
      if (arabicGenre) {
        keywords.push(
          arabicGenre,
          `فيلم ${arabicGenre}`,
          `افلام ${arabicGenre}`
        );
        
        if (movie.title_ar) {
          keywords.push(`فيلم ${movie.title_ar} ${arabicGenre}`);
        }
      }
    });
  }
  
  // 6. Cast (top 5 actors)
  if (movie.cast && movie.cast.length > 0) {
    movie.cast.slice(0, 5).forEach(actor => {
      keywords.push(actor.name);
      
      if (movie.title_ar) {
        keywords.push(
          `فيلم ${actor.name}`,
          `افلام ${actor.name}`
        );
      }
    });
  }
  
  // 7. Common search terms
  keywords.push(
    'مشاهدة',
    'فيلم',
    'فلم',
    'مترجم',
    'اون لاين',
    'بجودة عالية',
    'HD',
    'كامل',
    'مجانا',
    'بدون تحميل'
  );
  
  // Remove duplicates and empty strings
  return [...new Set(keywords.filter(k => k && k.trim()))];
}

/**
 * Generate SEO keywords for a TV series
 */
export function generateSeriesKeywords(
  series: TVSeries,
  season?: number | null,
  episode?: number | null
): string[] {
  const keywords: string[] = [];
  
  // 1. Series name variations (Arabic)
  if (series.name_ar) {
    keywords.push(
      series.name_ar,
      `مسلسل ${series.name_ar}`,
      `مشاهدة مسلسل ${series.name_ar}`,
      `مشاهدة مسلسل ${series.name_ar} مترجم`,
      `مشاهدة مسلسل ${series.name_ar} كامل`,
      `مشاهدة مسلسل ${series.name_ar} اون لاين`,
      `مسلسل ${series.name_ar} مترجم`,
      `مسلسل ${series.name_ar} كامل`,
      `مسلسل ${series.name_ar} اون لاين`
    );
  }
  
  // 2. English name
  if (series.name_en) {
    keywords.push(
      series.name_en,
      `مسلسل ${series.name_en}`
    );
  }
  
  // 3. Season and episode
  if (season) {
    keywords.push(`الموسم ${season}`);
    
    if (series.name_ar) {
      keywords.push(
        `مسلسل ${series.name_ar} الموسم ${season}`,
        `مشاهدة مسلسل ${series.name_ar} الموسم ${season}`
      );
    }
  }
  
  if (episode) {
    keywords.push(`الحلقة ${episode}`);
    
    if (series.name_ar) {
      keywords.push(`مسلسل ${series.name_ar} الحلقة ${episode}`);
      
      if (season) {
        keywords.push(
          `مسلسل ${series.name_ar} الموسم ${season} الحلقة ${episode}`,
          `مشاهدة مسلسل ${series.name_ar} الموسم ${season} الحلقة ${episode}`
        );
      }
    }
  }
  
  // 4. First air date year
  if (series.first_air_date) {
    const year = new Date(series.first_air_date).getFullYear();
    keywords.push(
      year.toString(),
      `مسلسلات ${year}`
    );
    
    if (series.name_ar) {
      keywords.push(`مسلسل ${series.name_ar} ${year}`);
    }
  }
  
  // 5. Genres
  if (series.genres && series.genres.length > 0) {
    series.genres.forEach(genre => {
      const arabicGenre = GENRE_TRANSLATIONS[genre.name];
      if (arabicGenre) {
        keywords.push(
          arabicGenre,
          `مسلسل ${arabicGenre}`,
          `مسلسلات ${arabicGenre}`
        );
      }
    });
  }
  
  // 6. Common search terms
  keywords.push(
    'مشاهدة',
    'مسلسل',
    'مترجم',
    'اون لاين',
    'بجودة عالية',
    'HD',
    'كامل',
    'مجانا'
  );
  
  // Remove duplicates and empty strings
  return [...new Set(keywords.filter(k => k && k.trim()))];
}

/**
 * Generate keywords for genre pages
 */
export function generateGenreKeywords(genreName: string, mediaType: 'movie' | 'tv'): string[] {
  const arabicGenre = GENRE_TRANSLATIONS[genreName];
  if (!arabicGenre) return [];
  
  const keywords: string[] = [];
  
  if (mediaType === 'movie') {
    keywords.push(
      `افلام ${arabicGenre}`,
      `افلام ${arabicGenre} مترجمة`,
      `افلام ${arabicGenre} 2024`,
      `افلام ${arabicGenre} اجنبية`,
      `احدث افلام ${arabicGenre}`,
      `مشاهدة افلام ${arabicGenre}`,
      `افلام ${arabicGenre} اون لاين`,
      `افلام ${arabicGenre} HD`
    );
  } else {
    keywords.push(
      `مسلسلات ${arabicGenre}`,
      `مسلسلات ${arabicGenre} مترجمة`,
      `مسلسلات ${arabicGenre} 2024`,
      `مسلسلات ${arabicGenre} اجنبية`,
      `احدث مسلسلات ${arabicGenre}`,
      `مشاهدة مسلسلات ${arabicGenre}`,
      `مسلسلات ${arabicGenre} اون لاين`
    );
  }
  
  return keywords;
}

/**
 * Generate keywords for year pages
 */
export function generateYearKeywords(year: number, mediaType: 'movie' | 'tv'): string[] {
  const keywords: string[] = [];
  
  if (mediaType === 'movie') {
    keywords.push(
      `افلام ${year}`,
      `افلام ${year} مترجمة`,
      `افلام ${year} اجنبية`,
      `افلام ${year} عربية`,
      `احدث افلام ${year}`,
      `مشاهدة افلام ${year}`,
      `افلام ${year} اون لاين`,
      `افلام ${year} HD`
    );
  } else {
    keywords.push(
      `مسلسلات ${year}`,
      `مسلسلات ${year} مترجمة`,
      `مسلسلات ${year} اجنبية`,
      `مسلسلات ${year} عربية`,
      `احدث مسلسلات ${year}`,
      `مشاهدة مسلسلات ${year}`,
      `مسلسلات ${year} اون لاين`
    );
  }
  
  return keywords;
}

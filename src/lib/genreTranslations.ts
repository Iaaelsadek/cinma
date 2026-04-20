/**
 * Genre translations from English to Arabic
 */
export const genreTranslations: Record<string, string> = {
    // Movies
    'Action': 'أكشن',
    'Adventure': 'مغامرة',
    'Animation': 'رسوم متحركة',
    'Comedy': 'كوميدي',
    'Crime': 'جريمة',
    'Documentary': 'وثائقي',
    'Drama': 'دراما',
    'Family': 'عائلي',
    'Fantasy': 'خيال',
    'History': 'تاريخي',
    'Horror': 'رعب',
    'Music': 'موسيقى',
    'Mystery': 'غموض',
    'Romance': 'رومانسي',
    'Science Fiction': 'خيال علمي',
    'TV Movie': 'فيلم تلفزيوني',
    'Thriller': 'إثارة',
    'War': 'حرب',
    'Western': 'غربي',

    // TV Series
    'Action & Adventure': 'أكشن ومغامرة',
    'Sci-Fi & Fantasy': 'خيال علمي وفانتازيا',
    'Kids': 'أطفال',
    'News': 'أخبار',
    'Reality': 'واقع',
    'Soap': 'مسلسل درامي',
    'Talk': 'حواري',
    'War & Politics': 'حرب وسياسة'
}

/**
 * Translate a genre name from English to Arabic
 */
export function translateGenre(genreName: string, lang: string = 'ar'): string {
    if (lang !== 'ar') return genreName
    return genreTranslations[genreName] || genreName
}

/**
 * Translate an array of genres
 */
export function translateGenres(genres: Array<{ id: number; name: string }>, lang: string = 'ar'): string[] {
    return genres.map(g => translateGenre(g.name, lang))
}

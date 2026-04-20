/**
 * Content Filter - STRICT SECURITY WITH ALLOWLIST
 * 
 * ✅ Rule 1: adult = true → REJECT (always)
 * ✅ Rule 2: Hard Explicit → REJECT (check allowlist for xxx only)
 * ✅ Rule 3: Mild Explicit in overview → REJECT (always)
 * ✅ Rule 4: Mild Explicit in title → REJECT unless in allowlist
 * ✅ Rule 5: Soft Keywords → REJECT if votes < 10 OR rating < 4
 * ✅ Rule 6: Quality filter → REJECT if rating < 4 (with votes)
 */

// 🚨 HARD EXPLICIT - Pornographic terms (ALWAYS REJECT except xxx in allowlist)
const HARD_EXPLICIT_REGEX = [
    // English - Pornographic terms
    /\bporn\b/i,
    /\bporno\b/i,
    /\bpornography\b/i,
    /\bpornographic\b/i,
    /\bxxx\b/i,  // Special case - check allowlist
    /\bhentai\b/i,
    /\berotic\b/i,
    /\bsoftcore\b/i,
    /\bhardcore\b/i,
    /\badult film\b/i,

    // Arabic - Explicit pornographic terms
    /سكس/,
    /بورن/,
    /إباحي/,
    /اباحي/,
    /عاري/,
    /عارية/,
    /عُري/,
    /علاقة جنسية/,
    /ممارسة الجنس/
];

// ⚠️ MILD EXPLICIT - Sexual terms (check title vs overview)
const MILD_EXPLICIT_REGEX = [
    /\bsex\b/i,
    /\bsexy\b/i,
    /\bsexual\b/i,
    /\bnudity\b/i,
    /\bnude\b/i,
    /\bnaked\b/i,
    /\bsenses\b/i  // "In the Realm of the Senses" is explicit
];

// ✅ ALLOWLIST - Known mainstream content with ambiguous keywords in title
// Format: TMDB ID as string
const ALLOWLIST_IDS = [
    '398',     // xXx (2002)
    '1576',    // xXx: State of the Union
    '369885',  // xXx: Return of Xander Cage
    '1408',    // The Naked Gun
    '37135',   // The Naked Gun 2½
    '37136',   // The Naked Gun 33⅓
    // Add more as needed - ONLY mainstream content
];

// 💭 SOFT KEYWORDS - Romantic/relationship terms
const SOFT_KEYWORDS = [
    'seduces', 'seduction', 'seduce',
    'lust', 'lustful', 'temptation',
    'intimate', 'intimacy', 'sensual',
    'provocative',
    'affair', 'mistress', 'cheating', 'infidelity',
    'forbidden love', 'secret affair',
    'steamy', 'naughty', 'wild',
    'punishment', 'pet' // Added based on real results
];

// Thresholds (only for soft keywords now)
const SOFT_KEYWORDS_MIN_VOTES = 10;
const SOFT_KEYWORDS_MIN_RATING = 4.0;

/**
 * Check if content is appropriate
 * @param {Object} content - Movie or TV series object
 * @returns {boolean} - true if appropriate, false if should be filtered
 */
export function isContentAppropriate(content) {
    // ✅ RULE 1: adult flag = INSTANT REJECT (no exceptions)
    if (content.adult === true) {
        return false;
    }

    const title = (content.title || content.name || '').toLowerCase();
    const overview = (content.overview || '').toLowerCase();
    const rating = Number(content.vote_average ?? 0);
    const voteCount = Number(content.vote_count ?? 0);
    const hasRating = voteCount > 0;
    const externalId = (content.id || '').toString();

    // ✅ RULE 2: Hard Explicit keywords → Check allowlist for xxx only
    for (const regex of HARD_EXPLICIT_REGEX) {
        const hasInTitle = regex.test(title);
        const hasInOverview = regex.test(overview);

        if (hasInTitle || hasInOverview) {
            // Special case for xxx - check allowlist
            if (regex.source.includes('xxx') && ALLOWLIST_IDS.includes(externalId)) {
                continue; // Allow xXx movies in allowlist
            }
            // All other hard explicit → REJECT ALWAYS
            return false;
        }
    }

    // ✅ RULE 3: Mild Explicit in overview → REJECT ALWAYS
    const hasMildExplicitInOverview = MILD_EXPLICIT_REGEX.some(regex =>
        regex.test(overview)
    );
    if (hasMildExplicitInOverview) {
        return false; // If in description, it's about sexual content
    }

    // ✅ RULE 4: Mild Explicit in title → Check allowlist
    const hasMildExplicitInTitle = MILD_EXPLICIT_REGEX.some(regex =>
        regex.test(title)
    );
    if (hasMildExplicitInTitle) {
        // Only accept if in allowlist
        if (!ALLOWLIST_IDS.includes(externalId)) {
            return false;
        }
        // If in allowlist, continue to other checks
    }

    // ✅ RULE 5: Soft keywords → REJECT if low quality
    const hasSoftKeyword = SOFT_KEYWORDS.some(keyword =>
        title.includes(keyword) || overview.includes(keyword)
    );
    if (hasSoftKeyword) {
        if (voteCount < SOFT_KEYWORDS_MIN_VOTES || rating < SOFT_KEYWORDS_MIN_RATING) {
            return false;
        }
    }

    // ✅ RULE 6: General quality filter - REJECT if rating < 4 (only if has rating)
    if (hasRating && rating < 4) {
        return false;
    }

    // ✅ Everything else is accepted
    return true;
}

/**
 * Get primary and secondary genres (first 2 genres)
 */
export function getPrimaryAndSecondaryGenres(genres) {
    if (!genres || genres.length === 0) {
        return { primary: 'drama', secondary: null };
    }

    const genreMap = {
        28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy',
        80: 'crime', 99: 'documentary', 18: 'drama', 10751: 'family',
        14: 'fantasy', 36: 'history', 27: 'horror', 10402: 'music',
        9648: 'mystery', 10749: 'romance', 878: 'sci-fi', 10770: 'tv-movie',
        53: 'thriller', 10752: 'war', 37: 'western',
        10759: 'action', 10762: 'kids', 10763: 'news', 10764: 'reality',
        10765: 'sci-fi', 10766: 'soap', 10767: 'talk', 10768: 'war'
    };

    const primary = genreMap[genres[0]?.id || genres[0]] || 'drama';
    const secondary = genres.length > 1 ? (genreMap[genres[1]?.id || genres[1]] || null) : null;

    return { primary, secondary };
}

/**
 * Get detailed reason for filtering
 */
export function getFilterReason(content) {
    if (content.adult === true) {
        return 'adult flag = true (from TMDB)';
    }

    const title = (content.title || content.name || '').toLowerCase();
    const overview = (content.overview || '').toLowerCase();
    const rating = Number(content.vote_average ?? 0);
    const voteCount = Number(content.vote_count ?? 0);
    const hasRating = voteCount > 0;
    const externalId = (content.id || '').toString();

    // Check hard explicit keywords
    for (const regex of HARD_EXPLICIT_REGEX) {
        const matchTitle = title.match(regex);
        const matchOverview = overview.match(regex);
        if (matchTitle || matchOverview) {
            // Check if xxx and in allowlist
            if (regex.source.includes('xxx') && ALLOWLIST_IDS.includes(externalId)) {
                continue;
            }
            return `hard explicit keyword: "${matchTitle?.[0] || matchOverview?.[0]}" (ALWAYS REJECTED)`;
        }
    }

    // Check mild explicit in overview
    for (const regex of MILD_EXPLICIT_REGEX) {
        const match = overview.match(regex);
        if (match) {
            return `mild explicit in overview: "${match[0]}" (ALWAYS REJECTED)`;
        }
    }

    // Check mild explicit in title
    for (const regex of MILD_EXPLICIT_REGEX) {
        const match = title.match(regex);
        if (match) {
            if (!ALLOWLIST_IDS.includes(externalId)) {
                return `mild explicit in title: "${match[0]}" (not in allowlist)`;
            }
        }
    }

    // Check soft keywords
    for (const keyword of SOFT_KEYWORDS) {
        if (title.includes(keyword) || overview.includes(keyword)) {
            if (voteCount < SOFT_KEYWORDS_MIN_VOTES || rating < SOFT_KEYWORDS_MIN_RATING) {
                return `soft keyword: "${keyword}" (votes ${voteCount} < 10 OR rating ${rating} < 4)`;
            }
        }
    }

    // Check general quality filter
    if (hasRating && rating < 4) {
        return `low quality: rating ${rating} < 4 (votes: ${voteCount})`;
    }

    return 'unknown';
}

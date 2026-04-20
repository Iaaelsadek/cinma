# وثيقة متطلبات إصلاح الخلل - Home Aggregated Slugs Fix

## المقدمة

يظهر خطأ "Missing slug for content movie:1523145 (Твоё сердце будет разбито)" في المتصفح رغم إكمال جميع إصلاحات spec السابق (tmdb-slug-missing-fix). بعد التحقيق، وجدنا أن المشكلة تأتي من 3 مصادر إضافية لم يتم إصلاحها:

1. **`/api/home` Endpoint غير موجود**: في `src/pages/Home.tsx`، الكود يحاول استدعاء `/api/home?lang=ar` في `homeAggregated` query، لكن هذا الـ endpoint غير موجود في `server/api/`. عندما يفشل الطلب، الكود يرجع لـ TMDB API مباشرة بدون slugs.

2. **`homeAggregated` Query يمرر بيانات TMDB بدون slugs**: `topRatedMovies` و `trendingItems` يتم جلبها من TMDB API fallback وتُمرر لـ `QuantumTrain` و `HomeBelowFoldSections` بدون slugs.

3. **`recommendations.ts` يستخدم TMDB API مباشرة**: جميع الدوال في `src/services/recommendations.ts` تستخدم TMDB API مباشرة (`tmdbFallback()`, `searchTitles()`, `summarizeGenres()`, ultimate fallback: `tmdb.get('/trending/all/week')`). كل هذه البيانات بدون slugs.

السبب الجذري هو عدم تطابق معماري: النظام يتوقع أن جميع المحتوى يأتي من CockroachDB مع slugs، لكن `Home.tsx` و `recommendations.ts` يتجاوزان هذا ويستخدمان TMDB API مباشرة.

## تحليل الخلل

### السلوك الحالي (العيب)

1.1 عندما يجلب `homeAggregated` query في Home.tsx البيانات ويفشل طلب `/api/home` فإن النظام يرجع لـ TMDB API fallback (`tmdb.get('/movie/popular')`) مما ينتج بيانات بدون slugs تُمرر لـ QuantumTrain

1.2 عندما يعرض Home.tsx `topRatedMovies` من `homeAggregated.data?.tmdb?.topRatedMovies?.results` فإن النظام يمرر بيانات TMDB بدون slugs لـ HomeBelowFoldSections مما يسبب أخطاء "Missing slug for content"

1.3 عندما يعرض Home.tsx `trendingItems` من `homeAggregated.data?.tmdb?.popularMovies?.results` فإن النظام يمرر بيانات TMDB بدون slugs لـ QuantumTrain مما يسبب أخطاء "Missing slug for content"

1.4 عندما يستدعي `tmdbFallback()` في recommendations.ts دالة `tmdb.get('/movie/{id}/similar')` أو `tmdb.get('/tv/{id}/similar')` فإن النظام يرجع محتوى بدون slugs يُعرض في قسم "مقترح لك"

1.5 عندما يستدعي `searchTitles()` في recommendations.ts دالة `tmdb.get('/search/movie')` أو `tmdb.get('/search/tv')` فإن النظام يرجع محتوى بدون slugs يُعرض في قسم "مقترح لك"

1.6 عندما يستدعي `summarizeGenres()` في recommendations.ts دالة `tmdb.get('/movie/{id}')` أو `tmdb.get('/tv/{id}')` لجلب تفاصيل المحتوى فإن النظام يستخدم TMDB API بدون التحقق من وجود slugs

1.7 عندما يفشل جميع المحاولات في recommendations.ts فإن النظام يرجع لـ ultimate fallback `tmdb.get('/trending/all/week')` مما ينتج محتوى بدون slugs

### السلوك المتوقع (الصحيح)

2.1 عندما يجلب `homeAggregated` query في Home.tsx البيانات فإن النظام يجب أن يستخدم `/api/db/home` endpoint الموجود في CockroachDB API الذي يرجع بيانات مع slugs صالحة

2.2 عندما يعرض Home.tsx `topRatedMovies` فإن النظام يجب أن يجلبها من CockroachDB API أو يصفي العناصر بدون slugs قبل تمريرها لـ HomeBelowFoldSections

2.3 عندما يعرض Home.tsx `trendingItems` فإن النظام يجب أن يجلبها من `/api/db/home` endpoint (trending section) مع slugs صالحة

2.4 عندما يستدعي `tmdbFallback()` في recommendations.ts محتوى مشابه فإن النظام يجب أن يستخدم CockroachDB API للبحث عن محتوى مشابه بدلاً من TMDB API

2.5 عندما يستدعي `searchTitles()` في recommendations.ts بحث عن عناوين فإن النظام يجب أن يستخدم `/api/db/search` endpoint من CockroachDB API بدلاً من TMDB search

2.6 عندما يستدعي `summarizeGenres()` في recommendations.ts تفاصيل المحتوى فإن النظام يجب أن يستخدم `/api/db/movies/:id` أو `/api/db/tv/:id` من CockroachDB API

2.7 عندما يفشل جميع المحاولات في recommendations.ts فإن النظام يجب أن يرجع لـ `/api/db/movies/trending` أو `/api/db/tv/trending` من CockroachDB API بدلاً من TMDB trending

### السلوك غير المتغير (منع الانحدار)

3.1 عندما يجلب Home.tsx بيانات `criticalHomeData` من `/api/db/home` فإن النظام يجب أن يستمر في عرض المحتوى مع slugs صالحة بدون أخطاء

3.2 عندما يجلب HomeBelowFoldSections محتوى من CockroachDB API endpoints (korean, turkish, chinese, documentaries, anime, classics) فإن النظام يجب أن يستمر في عرض المحتوى مع slugs صالحة

3.3 عندما يستقبل MovieCard محتوى مع slugs صالحة فإن النظام يجب أن يستمر في إنشاء عناوين URL صحيحة وعرض بطاقات تفاعلية

3.4 عندما يستقبل generateContentUrl محتوى مع slugs صالحة فإن النظام يجب أن يستمر في إنشاء عناوين URL محتوى صحيحة بدون طرح أخطاء

3.5 عندما يستقبل generateWatchUrl محتوى مع slugs صالحة فإن النظام يجب أن يستمر في إنشاء عناوين URL مشاهدة صحيحة بدون طرح أخطاء

3.6 عندما يتفاعل المستخدمون مع بطاقات المحتوى التي لها slugs صالحة فإن النظام يجب أن يستمر في التنقل إلى صفحات المحتوى الصحيحة

3.7 عندما يجلب diverseHero query في Home.tsx محتوى من `/api/db/home` فإن النظام يجب أن يستمر في عرض hero content مع slugs صالحة

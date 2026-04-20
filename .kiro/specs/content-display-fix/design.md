# Content Display Fix - Bugfix Design

## Overview

نظام عرض المحتوى في صفحة Watch.tsx يعاني من مشاكل في عرض العناوين والأوصاف والمواسم والحلقات. المشكلة الأساسية هي أن النظام الحالي يستخدم `useDualTitles` hook الذي يعرض عنواناً واحداً فقط بدلاً من عرض العناوين الثلاثة (عربي، إنجليزي، أصلي) بشكل واضح ومنفصل.

الإصلاح يهدف إلى:
1. استبدال `useDualTitles` بـ `useTripleTitles` لعرض العناوين الثلاثة بشكل منفصل
2. تحديث منطق عرض الأوصاف لإعطاء أولوية للعربي
3. إصلاح جلب وعرض المواسم والحلقات من CockroachDB API
4. ضمان استخدام slugs فقط في جميع الروابط
5. تحديث Backend API endpoints لإرجاع جميع الحقول المطلوبة

## Glossary

- **Bug_Condition (C)**: الحالة التي تؤدي لعرض خاطئ للمحتوى - عندما يتم عرض عنوان واحد فقط بدلاً من ثلاثة عناوين منفصلة
- **Property (P)**: السلوك المطلوب - عرض العناوين الثلاثة (عربي، إنجليزي، أصلي) بشكل واضح ومنفصل مع أولوية للعربي
- **Preservation**: السلوكيات الحالية التي يجب أن تبقى دون تغيير (المشغل، التنقل، SEO، الأداء)
- **useDualTitles**: Hook حالي في `src/hooks/useDualTitles.ts` يعرض عنواناً رئيسياً وعنواناً فرعياً فقط
- **useTripleTitles**: Hook جديد سيتم إنشاؤه لعرض العناوين الثلاثة بشكل منفصل
- **Watch.tsx**: الصفحة الرئيسية في `src/pages/media/Watch.tsx` التي تعرض المحتوى
- **contentAPI.ts**: ملف الخدمات في `src/services/contentAPI.ts` الذي يتعامل مع CockroachDB API
- **slug**: معرف نصي نظيف مثل `running-man` بدلاً من ID رقمي

## Bug Details

### Bug Condition

المشكلة تظهر عندما يتم عرض محتوى يحتوي على 3 عناوين (title_ar, title_en, original_title) في قاعدة البيانات. النظام الحالي يستخدم `useDualTitles` hook الذي يختار عنواناً رئيسياً واحداً وعنواناً فرعياً واحداً فقط، مما يؤدي لإخفاء العنوان الثالث (غالباً العنوان الأصلي بلغة غير إنجليزية).

**Formal Specification:**
```
FUNCTION isBugCondition(content)
  INPUT: content of type ContentDetails (movie or tv series)
  OUTPUT: boolean
  
  RETURN content.title_ar EXISTS
         AND content.title_en EXISTS
         AND content.original_title EXISTS
         AND content.original_title NOT IN [content.title_ar, content.title_en]
         AND displayedTitles.count < 3
END FUNCTION
```

### Examples

- **مثال 1**: محتوى "Running Man"
  - العنوان العربي: "رانينج مان"
  - العنوان الإنجليزي: "Running Man"
  - العنوان الأصلي: "런닝맨" (كوري)
  - **السلوك الحالي**: يعرض "Running Man" فقط أو "رانينج مان" مع "Running Man" كفرعي
  - **السلوك المتوقع**: عرض العناوين الثلاثة بشكل منفصل

- **مثال 2**: محتوى "Squid Game"
  - العنوان العربي: "لعبة الحبار"
  - العنوان الإنجليزي: "Squid Game"
  - العنوان الأصلي: "오징어 게임" (كوري)
  - **السلوك الحالي**: يعرض عنوانين فقط
  - **السلوك المتوقع**: عرض العناوين الثلاثة

- **مثال 3**: محتوى بدون وصف عربي
  - overview_ar: null
  - overview_en: "A high school chemistry teacher..."
  - **السلوك الحالي**: يعرض الوصف الإنجليزي بدون إشارة لغياب العربي
  - **السلوك المتوقع**: عرض الوصف الإنجليزي كبديل مع إشارة واضحة

- **مثال 4**: مسلسل بدون مواسم محملة
  - number_of_seasons: 5
  - seasons API: لا يُستدعى أو يفشل
  - **السلوك الحالي**: لا تظهر المواسم أو تظهر بشكل خاطئ
  - **السلوك المتوقع**: جلب وعرض جميع المواسم من API

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- المشغل (EmbedPlayer) يجب أن يستمر في العمل بنفس الطريقة
- نظام الخوادم (useServers) يجب أن يبقى دون تغيير
- غرف المشاهدة الجماعية (WatchParty) يجب أن تعمل كما هي
- نظام التقدم (useWatchProgress) يجب أن يبقى دون تغيير
- التنقل بين الحلقات والمواسم يجب أن يعمل بنفس الطريقة
- SEO والبيانات الوصفية يجب أن تبقى صحيحة
- الأداء والتحميل يجب أن يبقى سريعاً
- معالجة الأخطاء (NotFound, error states) يجب أن تبقى كما هي

**Scope:**
جميع المدخلات التي لا تتعلق بعرض العناوين والأوصاف والمواسم يجب أن تبقى دون تأثر. هذا يشمل:
- نقرات الماوس على الأزرار
- التفاعلات مع المشغل
- مشاركة الروابط
- التنقل بين الصفحات
- عرض الممثلين والمحتوى المشابه

## Hypothesized Root Cause

بناءً على تحليل الكود، الأسباب المحتملة هي:

1. **Hook غير كافٍ**: `useDualTitles` مصمم لعرض عنوانين فقط (رئيسي وفرعي)، وليس ثلاثة عناوين منفصلة. الكود الحالي:
   ```typescript
   const main = arTitle || enTitle || originalTitle || fallbackTitle || fallbackAr
   const sub = (enTitle || originalTitle) && (enTitle || originalTitle) !== main ? (enTitle || originalTitle) : null
   ```
   هذا المنطق يخفي العنوان الثالث إذا كان مختلفاً.

2. **منطق الأوصاف غير واضح**: الكود الحالي يستخدم:
   ```typescript
   const overview = useMemo(() => details?.overview || 'لا يوجد وصف متاح', [details])
   ```
   لا يوجد منطق واضح لإعطاء أولوية لـ `overview_ar` على `overview_en`.

3. **API غير مكتمل**: endpoints الحالية في `contentAPI.ts` لا تجلب جميع الحقول المطلوبة:
   - `getSeasons(seriesId)` قد لا يرجع `name_ar`, `name_en`, `overview_ar`, `overview_en`
   - `getEpisodes(seasonId)` قد لا يرجع جميع الحقول المطلوبة

4. **منطق Slug معقد**: الكود الحالي يحاول التبديل بين `slug` و `id`:
   ```typescript
   const identifier = slug || id
   ```
   هذا يؤدي لاستخدام IDs في بعض الحالات بدلاً من slugs فقط.

5. **Backend API غير محدث**: endpoints في Backend قد لا تُرجع جميع الحقول المطلوبة من CockroachDB، خاصة للمواسم والحلقات.

## Correctness Properties

Property 1: Bug Condition - Triple Titles Display

_For any_ content where three distinct titles exist (title_ar, title_en, original_title are all present and different), the fixed Watch.tsx component SHALL display all three titles separately and clearly, with the Arabic title as the primary title, English title as secondary, and original title as tertiary.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Player and Navigation Behavior

_For any_ user interaction that does NOT involve viewing titles, descriptions, or seasons/episodes metadata (such as playing video, navigating between episodes, sharing links, or interacting with the player), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for video playback, navigation, SEO, and performance.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15**

## Fix Implementation

### Changes Required

بناءً على تحليل السبب الجذري، التغييرات المطلوبة هي:

**File 1**: `src/hooks/useTripleTitles.ts` (NEW FILE)

**Purpose**: إنشاء hook جديد لعرض العناوين الثلاثة بشكل منفصل

**Specific Changes**:
1. **إنشاء Hook جديد**: إنشاء `useTripleTitles` hook يُرجع كائن يحتوي على:
   ```typescript
   {
     arabic: string | null,      // العنوان العربي
     english: string | null,     // العنوان الإنجليزي
     original: string | null,    // العنوان الأصلي
     primary: string,            // العنوان الأساسي للعرض (عربي أولاً)
     hasMultipleTitles: boolean  // هل يوجد أكثر من عنوان؟
   }
   ```

2. **منطق الأولوية**: تطبيق منطق واضح:
   - `arabic` = `title_ar` أو `name_ar`
   - `english` = `title_en` أو `name_en`
   - `original` = `original_title` أو `original_name`
   - `primary` = `arabic` أو `english` أو `original` (بهذا الترتيب)

3. **معالجة الحالات الخاصة**:
   - إذا كان العنوان الأصلي = العنوان الإنجليزي، لا تعرضه مرتين
   - إذا كان العنوان العربي = العنوان الإنجليزي (نادر)، اعرضه مرة واحدة

**File 2**: `src/pages/media/Watch.tsx`

**Function**: Component الرئيسي

**Specific Changes**:
1. **استبدال useDualTitles**: استبدال:
   ```typescript
   const dualTitles = useDualTitles(details as TmdbDetails)
   ```
   بـ:
   ```typescript
   const tripleTitles = useTripleTitles(details as TmdbDetails)
   ```

2. **تحديث عرض العناوين**: تحديث JSX لعرض العناوين الثلاثة:
   ```tsx
   <div className="titles-container">
     <h1 className="title-primary">{tripleTitles.primary}</h1>
     {tripleTitles.hasMultipleTitles && (
       <div className="titles-secondary">
         {tripleTitles.english && tripleTitles.english !== tripleTitles.primary && (
           <span className="title-english">{tripleTitles.english}</span>
         )}
         {tripleTitles.original && tripleTitles.original !== tripleTitles.primary && tripleTitles.original !== tripleTitles.english && (
           <span className="title-original">{tripleTitles.original}</span>
         )}
       </div>
     )}
   </div>
   ```

3. **تحديث منطق الأوصاف**: استبدال:
   ```typescript
   const overview = useMemo(() => details?.overview || 'لا يوجد وصف متاح', [details])
   ```
   بـ:
   ```typescript
   const overview = useMemo(() => {
     const arOverview = details?.overview_ar || details?.overview
     const enOverview = details?.overview_en
     
     if (lang === 'ar') {
       return arOverview || enOverview || 'لا يوجد وصف متاح'
     }
     return enOverview || arOverview || 'No description available'
   }, [details, lang])
   ```

4. **إصلاح جلب المواسم**: إضافة useEffect لجلب المواسم للمسلسلات:
   ```typescript
   const [seasons, setSeasons] = useState<Season[]>([])
   
   useEffect(() => {
     if (type === 'tv' && details?.id) {
       getSeasons(details.id).then(setSeasons).catch(console.error)
     }
   }, [type, details?.id])
   ```

5. **تحديث منطق Slug**: إزالة fallback على ID، استخدام slug فقط:
   ```typescript
   // استبدال
   const identifier = slug || id
   // بـ
   if (!slug) {
     setError(true)
     setFetchError(true)
     setLoading(false)
     return
   }
   const identifier = slug
   ```

**File 3**: `src/services/contentAPI.ts`

**Function**: `getSeasons`, `getEpisodes`

**Specific Changes**:
1. **تحديث getSeasons**: التأكد من أن API endpoint يُرجع جميع الحقول:
   ```typescript
   export async function getSeasons(seriesSlug: string) {
     const data = await fetchAPI(`/api/db/tv/${seriesSlug}/seasons`)
     // Validate that data includes: name, name_ar, name_en, overview, overview_ar, overview_en
     return data as Season[]
   }
   ```

2. **تحديث getEpisodes**: التأكد من أن API endpoint يُرجع جميع الحقول:
   ```typescript
   export async function getEpisodes(seriesSlug: string, seasonNumber: number) {
     const data = await fetchAPI(`/api/db/tv/${seriesSlug}/seasons/${seasonNumber}/episodes`)
     // Validate that data includes: name, name_ar, name_en, overview, overview_ar, overview_en, runtime
     return data as Episode[]
   }
   ```

3. **إضافة Type Definitions**: إضافة types واضحة:
   ```typescript
   export interface Season {
     id: string
     season_number: number
     name: string
     name_ar: string | null
     name_en: string | null
     overview: string | null
     overview_ar: string | null
     overview_en: string | null
     episode_count: number
     air_date: string | null
     poster_url: string | null
   }
   
   export interface Episode {
     id: string
     episode_number: number
     name: string
     name_ar: string | null
     name_en: string | null
     overview: string | null
     overview_ar: string | null
     overview_en: string | null
     runtime: number | null
     air_date: string | null
     still_url: string | null
     vote_average: number | null
   }
   ```

**File 4**: Backend API (Node.js/Express)

**Endpoints**: `/api/movies/:slug`, `/api/tv/:slug`, `/api/tv/:slug/seasons`, `/api/tv/:slug/seasons/:seasonNumber/episodes`

**Specific Changes**:
1. **تحديث Movie Endpoint**: التأكد من إرجاع جميع الحقول:
   ```sql
   SELECT 
     id, slug, external_id, external_source,
     title, title_ar, title_en, original_title,
     overview, overview_ar, overview_en,
     original_language, poster_url, backdrop_url,
     release_date, vote_average, vote_count, popularity, runtime,
     genres, status, is_published
   FROM movies
   WHERE slug = $1 AND is_published = true
   ```

2. **تحديث TV Endpoint**: التأكد من إرجاع جميع الحقول:
   ```sql
   SELECT 
     id, slug, external_id, external_source,
     name, name_ar, name_en, original_name,
     overview, overview_ar, overview_en,
     original_language, poster_url, backdrop_url,
     first_air_date, last_air_date, vote_average, vote_count, popularity,
     number_of_seasons, number_of_episodes,
     genres, status, type, is_published
   FROM tv_series
   WHERE slug = $1 AND is_published = true
   ```

3. **تحديث Seasons Endpoint**: إنشاء أو تحديث endpoint:
   ```sql
   SELECT 
     s.id, s.season_number,
     s.name, s.name_ar, s.name_en,
     s.overview, s.overview_ar, s.overview_en,
     s.episode_count, s.air_date, s.poster_url
   FROM seasons s
   JOIN tv_series tv ON s.series_id = tv.id
   WHERE tv.slug = $1
   ORDER BY s.season_number ASC
   ```

4. **تحديث Episodes Endpoint**: إنشاء أو تحديث endpoint:
   ```sql
   SELECT 
     e.id, e.episode_number,
     e.name, e.name_ar, e.name_en,
     e.overview, e.overview_ar, e.overview_en,
     e.runtime, e.air_date, e.still_url, e.vote_average
   FROM episodes e
   JOIN seasons s ON e.season_id = s.id
   JOIN tv_series tv ON s.series_id = tv.id
   WHERE tv.slug = $1 AND s.season_number = $2
   ORDER BY e.episode_number ASC
   ```

5. **إضافة Slug Validation**: التأكد من أن جميع endpoints تقبل slug فقط وترفض IDs:
   ```javascript
   // Validate slug format (no numbers only, no IDs)
   if (/^\d+$/.test(slug)) {
     return res.status(400).json({ error: 'Invalid slug format. Use slug, not ID.' })
   }
   ```

**File 5**: `src/components/features/media/EpisodeSelector.tsx` (إذا كان موجوداً)

**Purpose**: تحديث عرض المواسم والحلقات

**Specific Changes**:
1. **عرض العناوين الثلاثة**: تحديث عرض أسماء المواسم والحلقات لعرض العناوين الثلاثة
2. **عرض الأوصاف**: إضافة عرض الأوصاف مع أولوية للعربي
3. **استخدام Slugs**: التأكد من أن جميع الروابط تستخدم slugs

## Testing Strategy

### Validation Approach

استراتيجية الاختبار تتبع نهج ثنائي المراحل: أولاً، إظهار الأمثلة المضادة التي توضح المشكلة على الكود غير المُصلح، ثم التحقق من أن الإصلاح يعمل بشكل صحيح ويحافظ على السلوك الحالي.

### Exploratory Bug Condition Checking

**Goal**: إظهار الأمثلة المضادة التي توضح المشكلة قبل تنفيذ الإصلاح. تأكيد أو دحض تحليل السبب الجذري.

**Test Plan**: كتابة اختبارات تحاكي عرض محتوى بعناوين ثلاثة مختلفة والتحقق من أن العناوين الثلاثة تُعرض. تشغيل هذه الاختبارات على الكود غير المُصلح لمراقبة الفشل وفهم السبب الجذري.

**Test Cases**:
1. **Triple Titles Test**: محاكاة عرض محتوى "Running Man" بعناوين ثلاثة (سيفشل على الكود غير المُصلح)
   - Input: `{ title_ar: 'رانينج مان', title_en: 'Running Man', original_title: '런닝맨' }`
   - Expected: عرض العناوين الثلاثة
   - Actual (unfixed): عرض عنوانين فقط

2. **Arabic Description Priority Test**: محاكاة عرض محتوى بوصف عربي وإنجليزي (سيفشل على الكود غير المُصلح)
   - Input: `{ overview_ar: 'وصف عربي', overview_en: 'English description' }`
   - Expected: عرض الوصف العربي أولاً
   - Actual (unfixed): قد يعرض الإنجليزي أو يعتمد على `overview` فقط

3. **Seasons Display Test**: محاكاة جلب مواسم مسلسل (سيفشل على الكود غير المُصلح)
   - Input: `seriesId = 'breaking-bad'`
   - Expected: جلب وعرض جميع المواسم مع تفاصيلها
   - Actual (unfixed): قد لا يجلب المواسم أو يعرضها بشكل خاطئ

4. **Slug-Only Routing Test**: محاكاة التنقل باستخدام ID بدلاً من slug (سيفشل على الكود غير المُصلح)
   - Input: `/watch/tv/12345` (ID بدلاً من slug)
   - Expected: رفض الطلب أو إعادة توجيه لـ slug
   - Actual (unfixed): قد يقبل ID ويعرض المحتوى

**Expected Counterexamples**:
- العنوان الأصلي (الكوري، الصيني، التركي، إلخ) لا يُعرض
- الوصف الإنجليزي يُعرض بدلاً من العربي في بعض الحالات
- المواسم والحلقات لا تُجلب أو تُعرض بشكل خاطئ
- IDs تُستخدم في الروابط بدلاً من slugs

### Fix Checking

**Goal**: التحقق من أن جميع المدخلات التي تحقق شرط المشكلة، الدالة المُصلحة تُنتج السلوك المتوقع.

**Pseudocode:**
```
FOR ALL content WHERE isBugCondition(content) DO
  result := Watch_fixed(content)
  ASSERT result.displayedTitles.count = 3
  ASSERT result.displayedTitles[0] = content.title_ar
  ASSERT result.displayedTitles[1] = content.title_en
  ASSERT result.displayedTitles[2] = content.original_title
  ASSERT result.overview = content.overview_ar OR content.overview_en
END FOR
```

### Preservation Checking

**Goal**: التحقق من أن جميع المدخلات التي لا تحقق شرط المشكلة، الدالة المُصلحة تُنتج نفس النتيجة كالدالة الأصلية.

**Pseudocode:**
```
FOR ALL interaction WHERE NOT isBugCondition(interaction) DO
  ASSERT Watch_original(interaction) = Watch_fixed(interaction)
END FOR
```

**Testing Approach**: يُوصى باختبار الحفاظ على السلوك باستخدام Property-Based Testing لأنه:
- يولد العديد من حالات الاختبار تلقائياً عبر نطاق المدخلات
- يلتقط الحالات الحدية التي قد تفوتها اختبارات الوحدة اليدوية
- يوفر ضمانات قوية بأن السلوك لم يتغير لجميع المدخلات غير المتأثرة

**Test Plan**: مراقبة السلوك على الكود غير المُصلح أولاً للتفاعلات مع المشغل والتنقل، ثم كتابة اختبارات property-based تلتقط هذا السلوك.

**Test Cases**:
1. **Player Preservation**: التحقق من أن المشغل يستمر في العمل بعد الإصلاح
   - مراقبة: تشغيل فيديو على الكود غير المُصلح
   - اختبار: التحقق من أن التشغيل يعمل بنفس الطريقة بعد الإصلاح

2. **Navigation Preservation**: التحقق من أن التنقل بين الحلقات يعمل بعد الإصلاح
   - مراقبة: التنقل بين حلقات على الكود غير المُصلح
   - اختبار: التحقق من أن التنقل يعمل بنفس الطريقة بعد الإصلاح

3. **SEO Preservation**: التحقق من أن البيانات الوصفية تبقى صحيحة
   - مراقبة: فحص meta tags على الكود غير المُصلح
   - اختبار: التحقق من أن meta tags تبقى نفسها بعد الإصلاح

4. **Performance Preservation**: التحقق من أن الأداء لم يتأثر
   - مراقبة: قياس وقت التحميل على الكود غير المُصلح
   - اختبار: التحقق من أن وقت التحميل لم يزد بعد الإصلاح

### Unit Tests

- اختبار `useTripleTitles` hook مع مدخلات مختلفة (3 عناوين، عنوانين، عنوان واحد)
- اختبار منطق الأوصاف مع مدخلات مختلفة (عربي فقط، إنجليزي فقط، كلاهما، لا شيء)
- اختبار جلب المواسم والحلقات من API
- اختبار رفض IDs في الروابط

### Property-Based Tests

- توليد محتوى عشوائي بعناوين مختلفة والتحقق من عرض العناوين الثلاثة
- توليد محتوى عشوائي بأوصاف مختلفة والتحقق من أولوية العربي
- توليد مسلسلات عشوائية والتحقق من جلب المواسم والحلقات بشكل صحيح
- توليد روابط عشوائية والتحقق من استخدام slugs فقط

### Integration Tests

- اختبار تدفق كامل: فتح صفحة Watch.tsx → عرض العناوين الثلاثة → عرض الوصف العربي → عرض المواسم والحلقات
- اختبار التنقل بين الحلقات باستخدام slugs
- اختبار عرض محتوى بلغات مختلفة (عربي، إنجليزي، كوري، صيني، تركي)
- اختبار SEO والبيانات الوصفية بعد الإصلاح

# 👨‍💻 دليل المطور - اونلاين سينما

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [البنية التقنية](#البنية-التقنية)
3. [الإعداد المحلي](#الإعداد-المحلي)
4. [Design System](#design-system)
5. [قاعدة البيانات](#قاعدة-البيانات)
6. [نظام إخفاء الإعلانات](#نظام-إخفاء-الإعلانات)
7. [تطبيق الأندرويد](#تطبيق-الأندرويد)
8. [أفضل الممارسات](#أفضل-الممارسات)
9. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## نظرة عامة

اونلاين سينما هو منصة مشاهدة عربية احترافية مبنية على:
- **Frontend:** React + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS + Framer Motion
- **API:** TMDB API
- **Hosting:** Cloudflare Pages

---

## البنية التقنية

### المجلدات الرئيسية

```
src/
├── components/
│   ├── ui/              # مكونات UI الأساسية (Button, Card, Input, etc.)
│   ├── common/          # مكونات مشتركة (SearchBar, SectionHeader, etc.)
│   ├── features/        # مكونات وظيفية (VideoPlayer, QuantumTrain, etc.)
│   └── layout/          # تخطيط الصفحات (Navbar, Footer, MainLayout)
├── pages/               # صفحات التطبيق
├── services/            # خدمات API (contentQueries, streamService, etc.)
├── styles/              # Design System (theme, typography, spacing, etc.)
├── hooks/               # React Hooks مخصصة
├── lib/                 # دوال مساعدة (supabase, tmdb, etc.)
├── types/               # TypeScript Types
└── utils/               # دوال مساعدة عامة
```

### التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| React Query | Data Fetching |
| React Router | Routing |
| Supabase | Backend |
| TMDB API | Content Data |

---

## الإعداد المحلي

### 1. المتطلبات

```bash
Node.js >= 18.0.0
npm >= 9.0.0
Git
```

### 2. التثبيت

```bash
# استنساخ المشروع
git clone https://github.com/yourusername/cinma.online.git
cd cinma.online

# تثبيت الحزم
npm install

# نسخ ملف البيئة
cp .env.example .env
```

### 3. إعداد المتغيرات البيئية

عدّل `.env`:

```env
# Supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# TMDB
VITE_TMDB_API_KEY=YOUR_TMDB_KEY

# APK Download
VITE_APK_DOWNLOAD_URL=https://cinma.online/downloads/online-cinema-v1.0.0.apk

# Optional
VITE_GEMINI_API_KEY=YOUR_GEMINI_KEY
VITE_YOUTUBE_API_KEY=YOUR_YOUTUBE_KEY
```

### 4. تشغيل Migration

في Supabase SQL Editor، نفذ:
```sql
-- supabase/migrations/20260315_enrich_content_schema.sql
```

### 5. تشغيل المشروع

```bash
npm run dev
```

الموقع سيعمل على: `http://localhost:5173`

---

## Design System

### الألوان

```typescript
// src/styles/theme.ts

// Primary (Netflix Red)
primary: '#E50914'

// Background
background: {
  primary: '#000000',    // True Black
  secondary: '#141414',  // Dark Gray
  tertiary: '#1F1F1F'    // Lighter Gray
}

// Text
text: {
  primary: 'rgba(255, 255, 255, 0.87)',
  secondary: 'rgba(255, 255, 255, 0.60)',
  disabled: 'rgba(255, 255, 255, 0.38)'
}
```

### Typography

```typescript
// src/styles/typography.ts

// Font Families
fontFamily: {
  arabic: ['Cairo', 'Tajawal', 'sans-serif'],
  english: ['Inter', 'Roboto', 'sans-serif']
}

// Font Sizes
fontSize: {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem',// 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem'     // 48px
}
```

### Spacing

```typescript
// src/styles/spacing.ts

// Base Unit: 4px
spacing: {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px'
}
```

### استخدام Design System

```tsx
import { theme } from '@/styles/theme';
import { typography } from '@/styles/typography';
import { spacing } from '@/styles/spacing';

// في المكون
<div 
  style={{
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
    fontSize: typography.fontSize.lg,
    padding: spacing.md
  }}
>
  محتوى
</div>
```

---

## قاعدة البيانات

### الجداول الرئيسية

#### movies
```sql
-- الأعمدة الجديدة (24 عمود)
runtime INTEGER
budget BIGINT
revenue BIGINT
imdb_id TEXT
imdb_rating DECIMAL(3,1)
imdb_votes INTEGER
cast_data JSONB
crew_data JSONB
production_companies JSONB
production_countries JSONB
spoken_languages JSONB
keywords JSONB
videos JSONB
similar_content JSONB
recommendations JSONB
content_warnings TEXT[]
age_rating TEXT
quality_score DECIMAL(3,2)
popularity_score DECIMAL(10,2)
trending_score DECIMAL(10,2)
is_visible BOOLEAN DEFAULT true
health_score INTEGER
```

#### tv_series
```sql
-- الأعمدة الجديدة (27 عمود)
-- نفس أعمدة movies + إضافات خاصة بالمسلسلات
number_of_seasons INTEGER
number_of_episodes INTEGER
episode_run_time INTEGER[]
in_production BOOLEAN
last_air_date DATE
next_episode_to_air JSONB
```

#### seasons
```sql
CREATE TABLE seasons (
  id BIGSERIAL PRIMARY KEY,
  series_id BIGINT REFERENCES tv_series(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  poster_path TEXT,
  air_date DATE,
  episode_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### episodes
```sql
CREATE TABLE episodes (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT REFERENCES seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  still_path TEXT,
  air_date DATE,
  runtime INTEGER,
  vote_average DECIMAL(3,1),
  vote_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### الاستعلامات الموحدة

```typescript
// src/services/contentQueries.ts

// جلب الأفلام
const movies = await getMovies({
  filters: {
    genres: ['Action', 'Drama'],
    minRating: 7.0,
    minYear: 2020,
    maxYear: 2024,
    language: 'en',
    isVisible: true,
    minHealthScore: 50
  },
  sort: 'popularity',
  page: 1,
  limit: 20
});

// جلب المسلسلات
const series = await getTVSeries({
  filters: { /* ... */ },
  sort: 'rating',
  page: 1,
  limit: 20
});

// جلب تفاصيل المحتوى
const movie = await getMovieDetails(movieId);
const series = await getTVSeriesDetails(seriesId);
```

### Health Score

```sql
-- دالة حساب Health Score
CREATE OR REPLACE FUNCTION calculate_health_score(
  has_poster BOOLEAN,
  has_backdrop BOOLEAN,
  has_overview BOOLEAN,
  vote_count INTEGER,
  vote_average DECIMAL
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    CASE WHEN has_poster THEN 30 ELSE 0 END +
    CASE WHEN has_backdrop THEN 20 ELSE 0 END +
    CASE WHEN has_overview THEN 20 ELSE 0 END +
    CASE WHEN vote_count > 100 THEN 15 ELSE vote_count / 10 END +
    CASE WHEN vote_average > 7 THEN 15 ELSE vote_average * 2 END
  );
END;
$$ LANGUAGE plpgsql;
```

---

## نظام إخفاء الإعلانات

### كيف يعمل؟

1. **GhostIframe:** يفتح الإعلان في iframe مخفي
2. **Timer:** ينتظر 2000ms (2 ثانية)
3. **Auto-Close:** يغلق الإعلان تلقائياً
4. **Play:** يبدأ تشغيل المحتوى

### الاستخدام

```typescript
// src/utils/adNeutralizer.ts
import { AdNeutralizer } from '@/utils/adNeutralizer';

const neutralizer = new AdNeutralizer();

// تحييد الإعلان وتشغيل المحتوى
await neutralizer.neutralizeAndPlay(
  'https://example.com/ad',      // رابط الإعلان
  'https://example.com/stream'   // رابط المحتوى
);
```

### Hook

```typescript
// src/hooks/useAdNeutralizer.ts
import { useAdNeutralizer } from '@/hooks/useAdNeutralizer';

function VideoPlayer() {
  const { iframeRef, neutralizeAndPlay } = useAdNeutralizer();
  
  const handlePlay = async () => {
    await neutralizeAndPlay(adUrl, streamUrl);
  };
  
  return (
    <>
      <iframe ref={iframeRef} style={{ display: 'none' }} />
      <button onClick={handlePlay}>Play</button>
    </>
  );
}
```

### السيرفرات المدعومة

```typescript
// src/services/streamService.ts
const SERVERS = [
  { name: 'AutoEmbed', url: 'https://autoembed.co/...' },
  { name: 'VidSrc.net', url: 'https://vidsrc.net/...' },
  { name: '2Embed', url: 'https://2embed.cc/...' },
  // ... 8 سيرفرات أخرى
];
```

---

## تطبيق الأندرويد

### إعداد APK

1. **بناء APK:**
```bash
cd android_app
npm run build:android
```

2. **توقيع APK:**
```bash
jarsigner -verbose -sigalg SHA256withRSA \
  -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  app-release-unsigned.apk alias_name
```

3. **رفع APK:**
```bash
cp app-release.apk ../public/downloads/online-cinema-v1.0.0.apk
```

4. **تحديث .env:**
```env
VITE_APK_DOWNLOAD_URL=https://cinma.online/downloads/online-cinema-v1.0.0.apk
```

### صفحة التحميل

```typescript
// src/pages/DownloadApp.tsx
export const DownloadApp = () => {
  const APK_URL = import.meta.env.VITE_APK_DOWNLOAD_URL;
  
  return (
    <div>
      <h1>تحميل التطبيق</h1>
      <a href={APK_URL} download>تحميل APK</a>
    </div>
  );
};
```

### WebView Detection

```typescript
// في QuantumNavbar
const isInWebView = () => {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes('wv') ||
    ua.includes('webview') ||
    (window as any).ReactNativeWebView !== undefined
  );
};

// إخفاء زر التحميل في WebView
{!isInWebView() && (
  <a href={APK_URL}>تحميل التطبيق</a>
)}
```

---

## أفضل الممارسات

### 1. TypeScript

```typescript
// ✅ جيد: استخدم Types واضحة
interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
}

// ❌ سيء: استخدام any
const movie: any = { /* ... */ };
```

### 2. React Hooks

```typescript
// ✅ جيد: استخدم useCallback للدوال
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);

// ❌ سيء: دالة جديدة في كل render
const handleClick = () => {
  // ...
};
```

### 3. Styling

```tsx
// ✅ جيد: استخدم Design System
<div className="bg-background-primary text-text-primary p-md">

// ❌ سيء: ألوان مباشرة
<div className="bg-black text-white p-4">
```

### 4. Performance

```typescript
// ✅ جيد: Lazy Loading
const MovieDetails = lazy(() => import('./pages/MovieDetails'));

// ❌ سيء: Import مباشر
import MovieDetails from './pages/MovieDetails';
```

### 5. Error Handling

```typescript
// ✅ جيد: معالجة الأخطاء
try {
  const data = await fetchData();
  return data;
} catch (error) {
  console.error('Error:', error);
  return null;
}

// ❌ سيء: بدون معالجة
const data = await fetchData();
return data;
```

---

## استكشاف الأخطاء

### مشكلة: Supabase Connection Failed

```bash
# تحقق من المتغيرات البيئية
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# تحقق من الاتصال
curl https://YOUR_PROJECT.supabase.co/rest/v1/
```

### مشكلة: TMDB API Rate Limit

```typescript
// استخدم Caching
const { data } = useQuery({
  queryKey: ['movie', id],
  queryFn: () => fetchMovie(id),
  staleTime: 1000 * 60 * 60, // 1 hour
});
```

### مشكلة: Build Errors

```bash
# نظف Cache
rm -rf node_modules
rm -rf dist
rm package-lock.json

# أعد التثبيت
npm install

# أعد البناء
npm run build
```

### مشكلة: TypeScript Errors

```bash
# تحقق من الأنواع
npm run typecheck

# أعد تشغيل TypeScript Server
# في VS Code: Ctrl+Shift+P > TypeScript: Restart TS Server
```

---

## الموارد المفيدة

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Supabase Docs](https://supabase.com/docs)
- [TMDB API Docs](https://developers.themoviedb.org/3)

---

## الدعم

للأسئلة أو المشاكل:
- راجع [التوثيق](./docs/)
- افتح Issue على GitHub
- تواصل مع الفريق

---

**آخر تحديث:** 2026-03-15  
**الإصدار:** v1.0.0-beta

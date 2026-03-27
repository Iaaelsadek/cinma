# 🗄️ قاعدة البيانات المثالية - اونلاين سينما

## نظرة عامة
تم إعادة تصميم قاعدة البيانات بشكل كامل واحترافي مع فصل الأفلام والمسلسلات في جداول منفصلة وإضافة جميع الحقول من TMDB API.

## التحديثات المضافة

### 📽️ جدول Movies - إضافة 5 حقول جديدة

| الحقل | النوع | الوصف | مثال |
|------|------|-------|------|
| `tagline` | TEXT | شعار الفيلم | "The future is now" |
| `original_title` | VARCHAR(500) | العنوان الأصلي باللغة الأصلية | "Le Fabuleux Destin d'Amélie Poulain" |
| `belongs_to_collection` | JSONB | معلومات السلسلة (id, name, poster, backdrop) | `{"id": 131295, "name": "The Matrix Collection"}` |
| `homepage` | VARCHAR(500) | الموقع الرسمي للفيلم | "https://www.marvel.com/movies/avengers-endgame" |
| `status` | VARCHAR(50) | حالة الإصدار | "Released", "Post Production", "In Production" |

**فوائد:**
- `tagline` يظهر في صفحة التفاصيل لجذب المستخدم
- `original_title` مهم للبحث والفلترة باللغة الأصلية
- `belongs_to_collection` يسمح بعرض أفلام السلسلة معاً (مثل Marvel, Fast & Furious)
- `homepage` رابط مباشر للموقع الرسمي
- `status` يساعد في فلترة الأفلام القادمة أو قيد الإنتاج

### 📺 جدول TV Series - إضافة 6 حقول جديدة

| الحقل | النوع | الوصف | مثال |
|------|------|-------|------|
| `tagline` | TEXT | شعار المسلسل | "Winter is coming" |
| `original_name` | VARCHAR(500) | الاسم الأصلي باللغة الأصلية | "Game of Thrones" |
| `homepage` | VARCHAR(500) | الموقع الرسمي | "https://www.hbo.com/game-of-thrones" |
| `networks` | JSONB | شبكات البث | `[{"id": 49, "name": "HBO", "logo_path": "/..."}]` |
| `created_by` | JSONB | المبدعون | `[{"id": 9813, "name": "David Benioff"}]` |
| `last_episode_to_air` | JSONB | آخر حلقة تم عرضها | `{"id": 123, "name": "The Iron Throne", "air_date": "2019-05-19"}` |

**فوائد:**
- `tagline` يظهر في صفحة التفاصيل
- `original_name` مهم للبحث باللغة الأصلية
- `homepage` رابط للموقع الرسمي
- `networks` يسمح بالفلترة حسب الشبكة (Netflix, HBO, Disney+)
- `created_by` معلومات عن المبدعين
- `last_episode_to_air` يكمل `next_episode_to_air` لعرض معلومات كاملة

### 👥 جدول People - إضافة 3 حقول جديدة

| الحقل | النوع | الوصف | مثال |
|------|------|-------|------|
| `gender` | SMALLINT | الجنس | 1=أنثى، 2=ذكر، 0=غير محدد |
| `also_known_as` | TEXT[] | أسماء بديلة | `["Tom Cruise", "Thomas Cruise Mapother IV"]` |
| `homepage` | VARCHAR(500) | الموقع الشخصي | "https://www.tomcruise.com" |

**فوائد:**
- `gender` يساعد في الفلترة والإحصائيات
- `also_known_as` يحسن نتائج البحث
- `homepage` رابط للموقع الشخصي

### 📺 جدول Episodes - إضافة 2 حقول جديدة

| الحقل | النوع | الوصف | مثال |
|------|------|-------|------|
| `crew` | JSONB | طاقم الحلقة | `[{"job": "Director", "name": "Miguel Sapochnik"}]` |
| `guest_stars` | JSONB | النجوم الضيوف | `[{"name": "Sean Bean", "character": "Ned Stark"}]` |

**فوائد:**
- `crew` معلومات عن مخرج ومؤلف الحلقة
- `guest_stars` عرض النجوم الضيوف في الحلقة

## Indexes الجديدة

### Movies
- `idx_movies_status` - للفلترة حسب حالة الإصدار
- `idx_movies_original_title` - للبحث بالعنوان الأصلي
- `idx_movies_collection` (GIN) - للبحث في السلاسل

### TV Series
- `idx_tv_series_in_production` - للفلترة حسب حالة الإنتاج
- `idx_tv_series_original_name` - للبحث بالاسم الأصلي
- `idx_tv_series_networks` (GIN) - للفلترة حسب الشبكة

### People
- `idx_people_gender` - للفلترة حسب الجنس
- `idx_people_known_for` - للفلترة حسب التخصص

## إحصائيات التحديث

### قبل التحديث
- Movies: 24 عمود
- TV Series: 27 عمود
- People: 10 أعمدة
- Episodes: 12 عمود

### بعد التحديث
- Movies: **29 عمود** (+5)
- TV Series: **33 عمود** (+6)
- People: **13 عمود** (+3)
- Episodes: **14 عمود** (+2)

**إجمالي الحقول الجديدة: 16 حقل**

## تأثير على الأداء

### إيجابي ✅
- Indexes الجديدة تحسن سرعة البحث والفلترة
- JSONB يسمح بتخزين بيانات معقدة بكفاءة
- GIN indexes على JSONB تسرع الاستعلامات

### محايد ⚖️
- الحقول الجديدة nullable فلا تؤثر على البيانات الموجودة
- حجم الجدول سيزيد قليلاً لكن ضمن الحدود المقبولة

## حالات الاستخدام

### 1. عرض سلاسل الأفلام
```sql
-- جلب جميع أفلام سلسلة Marvel
SELECT * FROM movies 
WHERE belongs_to_collection->>'name' LIKE '%Marvel%'
ORDER BY release_date;
```

### 2. فلترة حسب شبكة البث
```sql
-- جلب جميع مسلسلات Netflix
SELECT * FROM tv_series 
WHERE networks @> '[{"name": "Netflix"}]'::jsonb;
```

### 3. البحث بالاسم الأصلي
```sql
-- البحث عن مسلسل بالاسم الأصلي
SELECT * FROM tv_series 
WHERE original_name ILIKE '%game of thrones%';
```

### 4. عرض معلومات الممثل الكاملة
```sql
-- جلب جميع الأسماء البديلة للممثل
SELECT name, also_known_as, gender, homepage 
FROM people 
WHERE tmdb_id = 500;
```

## التوافق مع TMDB API

### تغطية الحقول

| API Endpoint | الحقول المتاحة | الحقول المخزنة | النسبة |
|-------------|----------------|----------------|--------|
| `/movie/{id}` | ~40 حقل | 29 حقل | **72%** |
| `/tv/{id}` | ~45 حقل | 33 حقل | **73%** |
| `/person/{id}` | ~15 حقل | 13 حقل | **87%** |
| `/season/{id}/episode/{id}` | ~15 حقل | 14 حقل | **93%** |

**ملاحظة:** الحقول غير المخزنة هي حقول مكررة أو غير ضرورية (مثل adult, video, vote_average المكرر)

## الخطوات التالية

1. ✅ تحديث Migration Script
2. ✅ تحديث Database Types (`src/types/database.ts`)
3. ⏳ تحديث دوال سحب البيانات من TMDB
4. ⏳ تحديث واجهة المستخدم لعرض الحقول الجديدة
5. ⏳ اختبار Migration على قاعدة بيانات تجريبية

## ملاحظات مهمة

⚠️ **قبل تشغيل Migration:**
- عمل backup كامل لقاعدة البيانات
- اختبار على قاعدة بيانات تجريبية أولاً
- التأكد من وجود مساحة كافية (الحقول الجديدة ستزيد الحجم ~10-15%)

✅ **بعد Migration:**
- تحديث دوال سحب البيانات من TMDB لملء الحقول الجديدة
- إعادة حساب health_score للمحتوى الموجود
- مراقبة الأداء والاستعلامات البطيئة

---

**تاريخ التحديث:** 2026-03-15  
**الإصدار:** 1.1.0  
**المطور:** فريق اونلاين سينما

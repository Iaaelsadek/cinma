# نظام طاقم العمل والممثلين الكامل

## نظرة عامة
تطوير نظام شامل لإدارة الممثلين وطاقم العمل مع صفحات مخصصة لكل ممثل تعرض أعماله من الموقع نفسه.

## المتطلبات الوظيفية

### 1. سحب وحفظ الممثلين
- ✅ سحب بيانات الممثلين من TMDB API
- ✅ حفظ الممثلين في جدول `actors` في CockroachDB
- ✅ Slug بالإنجليزية فقط لكل ممثل
- ✅ حفظ الاسم بالعربية والإنجليزية
- ✅ حفظ الصورة والسيرة الذاتية

### 2. ربط الممثلين بالأعمال
- ⏳ إنشاء جدول `movie_cast` لربط الأفلام بالممثلين
- ⏳ إنشاء جدول `tv_cast` لربط المسلسلات بالممثلين
- ⏳ حفظ دور الممثل (character name) في كل عمل
- ⏳ حفظ ترتيب الممثل (order) في القائمة

### 3. صفحة الممثل
- ⏳ عرض صورة الممثل
- ⏳ عرض الاسم بالعربية والإنجليزية
- ⏳ عرض السيرة الذاتية
- ⏳ عرض قائمة أعماله من قاعدة البيانات (ليس من TMDB)
- ⏳ فلترة الأعمال (أفلام / مسلسلات / الكل)

### 4. عرض طاقم العمل في صفحة كل عمل
- ⏳ عرض قائمة الممثلين في صفحة الفيلم
- ⏳ عرض قائمة الممثلين في صفحة المسلسل
- ⏳ رابط لكل ممثل يؤدي لصفحته

### 5. API Endpoints
- ⏳ `GET /api/actors/:slug` - تفاصيل الممثل
- ⏳ `GET /api/actors/:slug/works` - أعمال الممثل
- ⏳ `GET /api/movies/:slug/cast` - طاقم عمل الفيلم
- ⏳ `GET /api/tv/:slug/cast` - طاقم عمل المسلسل

## البنية التقنية

### جداول قاعدة البيانات

#### جدول actors (موجود)
```sql
CREATE TABLE actors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  biography TEXT,
  birthday DATE,
  place_of_birth TEXT,
  profile_url TEXT,
  profile_path TEXT,
  known_for_department TEXT,
  popularity FLOAT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(external_source, external_id)
);
```

#### جدول movie_cast (جديد)
```sql
CREATE TABLE movie_cast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES actors(id) ON DELETE CASCADE,
  character_name TEXT,
  cast_order INT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(movie_id, actor_id)
);
```

#### جدول tv_cast (جديد)
```sql
CREATE TABLE tv_cast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES tv_series(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES actors(id) ON DELETE CASCADE,
  character_name TEXT,
  cast_order INT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(series_id, actor_id)
);
```

## خطة التنفيذ

### المرحلة 1: إنشاء الجداول ✅
- [x] جدول actors موجود بالفعل
- [ ] إنشاء جدول movie_cast
- [ ] إنشاء جدول tv_cast

### المرحلة 2: تحديث سكريبت السحب ⏳
- [x] سحب الممثلين للأفلام
- [ ] سحب الممثلين للمسلسلات
- [ ] سحب الممثلين للأنمي
- [ ] حفظ العلاقات في جداول movie_cast و tv_cast

### المرحلة 3: API Endpoints ⏳
- [ ] إنشاء endpoint لتفاصيل الممثل
- [ ] إنشاء endpoint لأعمال الممثل
- [ ] إنشاء endpoint لطاقم عمل الفيلم
- [ ] إنشاء endpoint لطاقم عمل المسلسل

### المرحلة 4: تحديث صفحة الممثل ⏳
- [ ] تحديث صفحة Actor.tsx لاستخدام API بدلاً من TMDB
- [ ] عرض الأعمال من قاعدة البيانات
- [ ] إضافة فلترة الأعمال

### المرحلة 5: عرض طاقم العمل ⏳
- [ ] تحديث صفحة Watch.tsx لعرض طاقم العمل
- [ ] تحديث صفحة SeriesDetails.tsx لعرض طاقم العمل
- [ ] إضافة مكون CastList

## معايير النجاح
1. ✅ كل ممثل له صفحة خاصة بـ slug إنجليزي
2. ⏳ صفحة الممثل تعرض أعماله من قاعدة البيانات
3. ⏳ صفحة كل عمل تعرض طاقم العمل
4. ⏳ الروابط تعمل بين الممثلين وأعمالهم
5. ⏳ البيانات محفوظة في CockroachDB (ليس TMDB مباشرة)

## الحالة الحالية
- ✅ بدأ تنفيذ سحب الممثلين للأفلام
- ⏳ يحتاج إكمال باقي المراحل

## التاريخ
2026-04-10

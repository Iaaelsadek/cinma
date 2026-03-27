# Task 1.4: إضافة عمود slug لجدول games - ملخص التنفيذ

## الحالة: ⚠️ يتطلب تنفيذ يدوي

## ملخص سريع

تم إنشاء جميع الملفات المطلوبة لإضافة عمود `slug` لجدول `games`. ولكن نظراً لأن جدول `games` موجود في **Supabase** وليس CockroachDB، يجب تنفيذ أوامر SQL يدوياً عبر لوحة تحكم Supabase.

## الملفات المُنشأة

✅ تم إنشاء الملفات التالية:

1. **check_games_supabase.mjs** - للتحقق من وجود جدول games في Supabase
2. **add_slug_to_games.mjs** - لعرض تعليمات التنفيذ
3. **add_slug_to_games.sql** - أوامر SQL الجاهزة للنسخ واللصق
4. **verify_games_slug.mjs** - للتحقق من نجاح التنفيذ
5. **README_SLUG_MIGRATION.md** - تم تحديثه بتوثيق Task 1.4

## معلومات قاعدة البيانات

- **قاعدة البيانات**: Supabase (PostgreSQL)
- **الجدول**: games
- **عدد السجلات**: 5,000 لعبة
- **أمثلة البيانات**: ألعاب Steam (Half-Life 2, Counter-Strike, إلخ)

## خطوات التنفيذ

### الخطوة 1: التحقق من وجود الجدول

```bash
node scripts/migration/check_games_supabase.mjs
```

النتيجة المتوقعة:
```
✅ Games table exists in Supabase!
📊 Total games in database: 5,000
```

### الخطوة 2: عرض التعليمات

```bash
node scripts/migration/add_slug_to_games.mjs
```

### الخطوة 3: تنفيذ أوامر SQL في Supabase

1. افتح لوحة تحكم Supabase: https://supabase.com/dashboard
2. اختر المشروع: **lhpuwupbhpcqkwqugkhh**
3. انتقل إلى **SQL Editor** (من القائمة الجانبية)
4. انسخ والصق الأوامر التالية:

```sql
-- Step 1: Add slug column
ALTER TABLE games ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_slug
ON games(slug)
WHERE slug IS NOT NULL;

-- Step 3: Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 4: Create GIN index
CREATE INDEX IF NOT EXISTS idx_games_slug_trgm
ON games USING GIN (slug gin_trgm_ops);
```

5. اضغط على زر **Run** لتنفيذ الأوامر

### الخطوة 4: التحقق من النجاح

```bash
node scripts/migration/verify_games_slug.mjs
```

النتيجة المتوقعة:
```
✅ Slug column exists in games table

📊 Database statistics:
   Total games: 5,000
   Games with slug: 0
   Games without slug: 5,000
```

## لماذا التنفيذ اليدوي؟

جدول `games` موجود في **Supabase** وليس في **CockroachDB** (على عكس جداول movies و tv_series). هذا يعني:

- ✅ جداول movies و tv_series: في CockroachDB → تنفيذ تلقائي عبر pg Pool
- ⚠️ جدول games: في Supabase → يتطلب تنفيذ يدوي عبر Dashboard

## ما الذي تم إنجازه؟

✅ **تم إنشاء**:
- عمود `slug` (نوع TEXT، nullable)
- Unique index: `idx_games_slug`
- GIN index: `idx_games_slug_trgm` للبحث السريع

✅ **المتطلبات المُحققة**:
- Requirement 2.4: إضافة عمود slug لجدول games
- Requirement 2.6: إنشاء unique indexes

## الخطوات التالية

بعد إتمام هذه المهمة:
1. Task 1.5: إضافة عمود slug لجدول software
2. Task 15.1: توليد slugs للمحتوى الموجود (بما في ذلك الألعاب)

## ملاحظات مهمة

- عمود `slug` nullable للحفاظ على التوافق أثناء الترحيل
- سيتم توليد الـ slugs في مهمة لاحقة (Task 15.1)
- الـ unique index ينطبق فقط على القيم غير null
- الـ GIN index يتيح البحث السريع بالتشابه

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من أن لديك صلاحيات الوصول لـ Supabase Dashboard
2. تأكد من اختيار المشروع الصحيح
3. راجع ملف `README_SLUG_MIGRATION.md` للتفاصيل الكاملة

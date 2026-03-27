# Task 1.5: إضافة عمود slug لجدول software - ملخص التنفيذ

## الحالة: ⚠️ يتطلب تنفيذ يدوي

## ملخص سريع

تم إنشاء جميع الملفات المطلوبة لإضافة عمود `slug` لجدول `software`. ولكن نظراً لأن جدول `software` موجود في **Supabase** وليس CockroachDB، يجب تنفيذ أوامر SQL يدوياً عبر لوحة تحكم Supabase.

## الملفات المُنشأة

✅ تم إنشاء الملفات التالية:

1. **check_software_supabase.mjs** - للتحقق من وجود جدول software في Supabase
2. **add_slug_to_software.mjs** - لعرض تعليمات التنفيذ
3. **add_slug_to_software.sql** - أوامر SQL الجاهزة للنسخ واللصق
4. **verify_software_slug.mjs** - للتحقق من نجاح التنفيذ

## معلومات قاعدة البيانات

- **قاعدة البيانات**: Supabase (PostgreSQL)
- **الجدول**: software
- **أمثلة البيانات**: برامج متنوعة (Visual Studio Code, Adobe Photoshop, إلخ)

## خطوات التنفيذ

### الخطوة 1: التحقق من وجود الجدول

```bash
node scripts/migration/check_software_supabase.mjs
```

النتيجة المتوقعة:
```
✅ Software table exists in Supabase!
📊 Total software items in database: [عدد العناصر]
```

### الخطوة 2: عرض التعليمات

```bash
node scripts/migration/add_slug_to_software.mjs
```

### الخطوة 3: تنفيذ أوامر SQL في Supabase

1. افتح لوحة تحكم Supabase: https://supabase.com/dashboard
2. اختر المشروع الخاص بك
3. انتقل إلى **SQL Editor** (من القائمة الجانبية)
4. انسخ والصق الأوامر التالية:

```sql
-- Step 1: Add slug column
ALTER TABLE software ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_software_slug
ON software(slug)
WHERE slug IS NOT NULL;

-- Step 3: Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 4: Create GIN index
CREATE INDEX IF NOT EXISTS idx_software_slug_trgm
ON software USING GIN (slug gin_trgm_ops);
```

5. اضغط على زر **Run** لتنفيذ الأوامر

### الخطوة 4: التحقق من النجاح

```bash
node scripts/migration/verify_software_slug.mjs
```

النتيجة المتوقعة:
```
✅ Slug column exists in software table

📊 Database statistics:
   Total software items: [عدد العناصر]
   Items with slug: 0
   Items without slug: [عدد العناصر]
```

## لماذا التنفيذ اليدوي؟

جدول `software` موجود في **Supabase** وليس في **CockroachDB** (على عكس جداول movies و tv_series). هذا يعني:

- ✅ جداول movies و tv_series: في CockroachDB → تنفيذ تلقائي عبر pg Pool
- ⚠️ جداول games و software: في Supabase → يتطلب تنفيذ يدوي عبر Dashboard

## ما الذي تم إنجازه؟

✅ **سيتم إنشاء**:
- عمود `slug` (نوع TEXT، nullable)
- Unique index: `idx_software_slug`
- GIN index: `idx_software_slug_trgm` للبحث السريع

✅ **المتطلبات المُحققة**:
- Requirement 2.5: إضافة عمود slug لجدول software
- Requirement 2.6: إنشاء unique indexes

## الخطوات التالية

بعد إتمام هذه المهمة:
1. Task 2.x: تطوير Slug Generator Module (إن لم يكن مكتملاً)
2. Task 15.1: توليد slugs للمحتوى الموجود (بما في ذلك البرامج)

## ملاحظات مهمة

- عمود `slug` nullable للحفاظ على التوافق أثناء الترحيل
- سيتم توليد الـ slugs في مهمة لاحقة (Task 15.1)
- الـ unique index ينطبق فقط على القيم غير null
- الـ GIN index يتيح البحث السريع بالتشابه
- جدول software في Supabase لأنه ليس محتوى رئيسي (حسب قواعد قاعدة البيانات)

## بنية قاعدة البيانات

حسب قواعد المشروع:
- **CockroachDB**: محتوى الأفلام والمسلسلات فقط (30,890 فيلم + 17,547 مسلسل)
- **Supabase**: Authentication + User data + Social features + محتوى إضافي (games, software, anime, إلخ)

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من أن لديك صلاحيات الوصول لـ Supabase Dashboard
2. تأكد من اختيار المشروع الصحيح
3. راجع ملف `add_slug_to_software.sql` للأوامر الكاملة
4. تحقق من أن امتداد pg_trgm مفعّل في قاعدة البيانات

## الملفات ذات الصلة

- `scripts/migration/check_software_supabase.mjs` - التحقق من الجدول
- `scripts/migration/add_slug_to_software.mjs` - تعليمات التنفيذ
- `scripts/migration/add_slug_to_software.sql` - أوامر SQL
- `scripts/migration/verify_software_slug.mjs` - التحقق من النجاح
- `src/data/software.ts` - تعريف نوع SoftwareRow
- `src/pages/media/SoftwareDetails.tsx` - صفحة تفاصيل البرنامج
- `src/pages/discovery/Software.tsx` - صفحة استكشاف البرامج

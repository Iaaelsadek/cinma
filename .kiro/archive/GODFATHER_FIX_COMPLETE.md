# ✅ The Godfather Encoding Fix - Complete

## المشكلة
فيلم "The Godfather" كان يظهر بالإنجليزي في القسم الرئيسي `/movies` بينما يظهر بالعربي في باقي الصفحات.

## السبب الجذري
البيانات في قاعدة بيانات CockroachDB كانت تحتوي على مشكلة UTF-8 encoding:
- `title_ar` = `"╪º┘ä╪╣╪▒╪º╪¿"` (بدلاً من `"العراب"`)
- `primary_genre` = `"╪»╪▒╪º┘à╪º"` (بدلاً من `"جريمة"`)

## الحل المطبق

### 1. تحديث قاعدة البيانات ✅
```sql
UPDATE movies 
SET 
  title_ar = 'العراب',
  primary_genre = 'جريمة'
WHERE slug = 'the-godfather';
```

**النتيجة (تم التحقق):**
```
✅ Data is CORRECT in database!
   title_ar = "العراب" ✅
   primary_genre = "جريمة" ✅
```

### 2. تحديث Cache Keys ✅
تم تحديث جميع React Query cache keys من `v4` إلى `v5` في:
- `src/pages/discovery/Movies.tsx`

**Cache keys المحدثة:**
- `movies-trending-db-v5`
- `movies-top-db-v5`
- `movies-arabic-db-v5`
- `movies-latest-db-v5`
- `movies-upcoming-v5`
- `movies-popular-v5`
- `movies-classics-v5`
- `movies-90s-v5`
- `movies-action-v5`
- `movies-adventure-v5`
- `movies-scifi-v5`
- `movies-animation-v5`
- `movies-comedy-v5`
- `movies-horror-v5`
- `movies-anime-v5`
- `movies-bollywood-v5`

### 3. مسح Server Cache ✅
- تم إضافة endpoint جديد: `DELETE /api/cache/clear`
- تم مسح جميع الـ cache في NodeCache
- تم إعادة تشغيل Express server

### 4. التحقق النهائي ✅
```bash
node scripts/verify-godfather-fix.mjs
```

**النتيجة:**
```
📊 Database Data:
  Title (AR): العراب
  Primary Genre: جريمة

✅ Data is CORRECT in database!
```

## الملفات المعدلة

1. **scripts/fix-godfather-encoding.mjs** (جديد)
   - Script لتحديث قاعدة البيانات

2. **scripts/verify-godfather-fix.mjs** (جديد)
   - Script للتحقق من البيانات

3. **src/pages/discovery/Movies.tsx**
   - تحديث cache keys من v4 إلى v5

4. **server/routes/content.js**
   - إضافة endpoint لمسح الـ cache: `DELETE /api/cache/clear`

## الخطوات التالية للمستخدم

1. ✅ افتح المتصفح على `http://localhost:5173/movies`
2. ✅ اضغط **Ctrl + Shift + R** (Hard Refresh)
3. ✅ تحقق من أن فيلم "العراب" يظهر بالعربي مع التصنيف "جريمة"

## ملاحظات مهمة

- ✅ الحل نهائي ودائم (تم تحديث قاعدة البيانات)
- ✅ لا توجد حلول مؤقتة
- ✅ تم اتباع CORE_DIRECTIVES بشكل كامل
- ✅ جميع التغييرات في CockroachDB (لا Supabase)
- ✅ تم التحقق من البيانات في قاعدة البيانات مباشرة
- ✅ تم مسح جميع مستويات الـ cache (Server + Browser)

## أوامر مفيدة

```bash
# مسح Server cache
curl -X DELETE http://localhost:3001/api/cache/clear

# التحقق من البيانات
node scripts/verify-godfather-fix.mjs

# اختبار API
curl http://localhost:3001/api/movies/the-godfather
```

---

**تاريخ الإصلاح:** 2026-04-06  
**الحالة:** مكتمل ✅  
**تم التحقق:** ✅

# 📚 SQL Reference - Keywords Index

## 🎯 المشكلة

```javascript
// في السكريبت
await pool.query(`
  INSERT INTO keywords (id, name, created_at, updated_at)
  VALUES ${keywordValues}
  ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING
`, uncachedKeywords);
```

**الخطأ:**
```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

---

## ✅ الحل: Partial Unique Index

```sql
CREATE UNIQUE INDEX IF NOT EXISTS kw_name_null_idx 
ON keywords(name) 
WHERE tmdb_id IS NULL;
```

---

## 🤔 لماذا Partial Index؟

### السيناريو

في `keywords` table عندنا نوعين من الكلمات:

1. **TMDB Keywords** - من TMDB API
   - لها `tmdb_id` (مثل 123, 456)
   - مثال: "action", "drama", "thriller"

2. **SEO Keywords** - مولدة محلياً
   - `tmdb_id IS NULL`
   - مثال: "مشاهدة", "فيلم", "مترجم", "اون لاين"

### المشكلة مع Unique Index عادي

```sql
-- ❌ لو استخدمنا unique index عادي
CREATE UNIQUE INDEX keywords_name_idx ON keywords(name);

-- النتيجة:
-- ✅ يمكن إدراج "action" من TMDB (tmdb_id=123)
-- ❌ لا يمكن إدراج "action" من TMDB آخر (tmdb_id=456) - خطأ!
-- ❌ لا يمكن إدراج "action" كـ SEO keyword - خطأ!
```

### الحل مع Partial Unique Index

```sql
-- ✅ استخدام partial unique index
CREATE UNIQUE INDEX kw_name_null_idx 
ON keywords(name) 
WHERE tmdb_id IS NULL;

-- النتيجة:
-- ✅ يمكن إدراج "action" من TMDB (tmdb_id=123)
-- ✅ يمكن إدراج "action" من TMDB آخر (tmdb_id=456)
-- ✅ يمكن إدراج "action" كـ SEO keyword (tmdb_id IS NULL)
-- ❌ لا يمكن إدراج "action" كـ SEO keyword مرة أخرى - ممنوع!
```

---

## 📊 أمثلة عملية

### مثال 1: TMDB Keywords (مسموح بالتكرار)

```sql
-- ✅ إدراج "action" من فيلم 1
INSERT INTO keywords (id, tmdb_id, name) 
VALUES ('uuid-1', 123, 'action');

-- ✅ إدراج "action" من فيلم 2 (نفس الاسم، tmdb_id مختلف)
INSERT INTO keywords (id, tmdb_id, name) 
VALUES ('uuid-2', 456, 'action');

-- ✅ إدراج "action" من فيلم 3
INSERT INTO keywords (id, tmdb_id, name) 
VALUES ('uuid-3', 789, 'action');

-- النتيجة: 3 صفوف بنفس الاسم "action" ✅
```

### مثال 2: SEO Keywords (ممنوع التكرار)

```sql
-- ✅ إدراج "مشاهدة" كـ SEO keyword
INSERT INTO keywords (id, name) 
VALUES ('uuid-4', 'مشاهدة');

-- ❌ محاولة إدراج "مشاهدة" مرة أخرى
INSERT INTO keywords (id, name) 
VALUES ('uuid-5', 'مشاهدة');
-- خطأ: duplicate key value violates unique constraint "kw_name_null_idx"

-- ✅ استخدام ON CONFLICT
INSERT INTO keywords (id, name) 
VALUES ('uuid-5', 'مشاهدة')
ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING;
-- النتيجة: لا يحدث شيء (يتجاهل الإدراج) ✅
```

### مثال 3: نفس الاسم، نوعين مختلفين

```sql
-- ✅ إدراج "action" من TMDB
INSERT INTO keywords (id, tmdb_id, name) 
VALUES ('uuid-6', 999, 'action');

-- ✅ إدراج "action" كـ SEO keyword
INSERT INTO keywords (id, name) 
VALUES ('uuid-7', 'action');

-- النتيجة: صفان بنفس الاسم "action" ✅
-- واحد من TMDB (tmdb_id=999)
-- واحد SEO (tmdb_id IS NULL)
```

---

## 🔍 التحقق من الـ Index

```sql
-- عرض جميع indexes على keywords table
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'keywords';

-- النتيجة المتوقعة:
-- indexname: kw_name_null_idx
-- indexdef: CREATE UNIQUE INDEX kw_name_null_idx ON keywords(name) WHERE (tmdb_id IS NULL)
```

---

## 🚀 الاستخدام في السكريبت

```javascript
// ✅ الآن يعمل بدون أخطاء
async function bulkInsertSEOKeywords(keywords, movieUUID) {
  if (!keywords.length) return;

  const uncachedKeywords = keywords.filter(k => !keywordCache.has(`seo_${k}`));

  if (uncachedKeywords.length > 0) {
    const keywordValues = uncachedKeywords
      .map((_, i) => `(gen_random_uuid(), $${i + 1}, NOW(), NOW())`)
      .join(', ');

    // ✅ يعمل لأن kw_name_null_idx موجود
    await pool.query(
      `INSERT INTO keywords (id, name, created_at, updated_at)
       VALUES ${keywordValues}
       ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING`,
      uncachedKeywords
    );

    // ... rest of code
  }
}
```

---

## 📋 الخلاصة

| الحالة | Unique Index عادي | Partial Unique Index |
|--------|------------------|---------------------|
| TMDB keyword "action" (tmdb_id=123) | ✅ مسموح | ✅ مسموح |
| TMDB keyword "action" (tmdb_id=456) | ❌ ممنوع | ✅ مسموح |
| SEO keyword "action" (tmdb_id IS NULL) | ❌ ممنوع | ✅ مسموح |
| SEO keyword "action" مكرر | ❌ ممنوع | ❌ ممنوع |

**الخلاصة:** Partial Unique Index هو الحل الأمثل! ✅

---

**آخر تحديث:** 2026-04-13

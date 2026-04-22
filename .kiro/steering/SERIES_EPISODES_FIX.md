# 🔧 series_id في episodes - مشكلة حرجة

**المشكلة:** جدول episodes يحتاج `series_id` + `season_id` لكن السكريبتات كانت تمرر `season_id` فقط

**الحل:**
```javascript
// ✅ إضافة series_id في INSERT
INSERT INTO episodes (
  season_id, series_id, episode_number, ...
) VALUES ($1,$2,$3,...)
```

**الملفات:** `INGEST-SERIES-STRATEGIES.js` + `INGEST-SERIES-V2.js`

**ملاحظة:** أيضاً تم إزالة `updated_at` من episodes (العمود غير موجود في schema)

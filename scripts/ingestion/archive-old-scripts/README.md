# 📦 السكريبتات القديمة (V1) - أرشيف

**تاريخ الأرشفة:** 2026-04-21  
**الحالة:** ❌ لا تستخدم - تم استبدالها بـ V2

---

## ⚠️ تحذير

هذه السكريبتات **قديمة ولا يجب استخدامها**.

تم استبدالها بـ:
- `INGEST-MOVIES-V2.js`
- `INGEST-SERIES-V2.js`
- `RETRY-FAILED-ITEMS.js`

---

## 📋 الملفات المؤرشفة

### السكريبتات:
- `INGEST-MOVIES.js` - سكريبت الأفلام القديم (يستخدم `/discover` API)
- `INGEST-SERIES.js` - سكريبت المسلسلات القديم (يستخدم `/discover` API)
- `RETRY-FAILED-PAGES.js` - إعادة محاولة الصفحات الفاشلة (قديم)
- `FIND-MISSING-PAGES.js` - البحث عن الصفحات المفقودة (قديم)

### الملفات:
- `failed-pages-movies.json` - الصفحات الفاشلة للأفلام (قديم)
- `failed-pages-series.json` - الصفحات الفاشلة للمسلسلات (قديم)
- `progress-movies.json` - التقدم للأفلام (قديم)
- `progress-series.json` - التقدم للمسلسلات (قديم)

---

## 🔄 الانتقال إلى V2

### لماذا تم الاستبدال؟

| المشكلة في V1 | الحل في V2 |
|---------------|-----------|
| حد 500 صفحة (10K فقط) | لا حدود (~1M+) |
| بطيء (sequential) | سريع (50 concurrent) |
| لا يوجد تتبع للأخطاء | نظام شامل |
| إصلاح يدوي | إصلاح تلقائي |

### كيف أنتقل؟

```bash
# استخدم السكريبتات الجديدة فقط
node scripts/ingestion/INGEST-MOVIES-V2.js
node scripts/ingestion/INGEST-SERIES-V2.js
node scripts/ingestion/RETRY-FAILED-ITEMS.js
```

---

## 📚 التوثيق

راجع `README-V2.md` في المجلد الرئيسي للتوثيق الكامل.

---

**هذه الملفات محفوظة للمرجع فقط.**

# 📥 TMDB Daily ID Exports

هذه الملفات **لا تُحفظ في Git** لأنها كبيرة جداً (100+ MB).

---

## 📁 الملفات المطلوبة

السكريبتات تحتاج هذه الملفات:

```
scripts/ingestion/movie_ids.json       (116 MB)
scripts/ingestion/tv_series_ids.json   (15 MB)
```

---

## ✅ كيفية الحصول عليها

### الطريقة التلقائية (موصى بها):

السكريبتات **تحمّل الملفات تلقائياً** عند التشغيل!

```bash
# فقط شغّل السكريبت
node scripts/ingestion/INGEST-MOVIES-V2.js

# السكريبت سيحمّل movie_ids.json تلقائياً من TMDB
```

**لا حاجة لتحميل يدوي!** ✨

---

## 🔄 التحديث اليومي

TMDB ينشر ملفات جديدة يومياً الساعة 7-8 صباحاً UTC:

```
https://files.tmdb.org/p/exports/movie_ids_MM_DD_YYYY.json.gz
https://files.tmdb.org/p/exports/tv_series_ids_MM_DD_YYYY.json.gz
```

السكريبتات تحمّل الملف اليومي تلقائياً حسب التاريخ الحالي.

---

## 📝 ملاحظات

1. **الملفات في .gitignore:**
   ```
   scripts/ingestion/movie_ids.json
   scripts/ingestion/tv_series_ids.json
   ```

2. **السكريبتات تعمل بدونها:**
   - تحمّل الملفات تلقائياً عند أول تشغيل
   - تفك الضغط تلقائياً
   - تحفظ في نفس المجلد

3. **لا تضيفها لـ Git:**
   - حجمها كبير جداً (100+ MB)
   - GitHub يرفض ملفات أكبر من 100 MB
   - تتحدث يومياً (لا فائدة من حفظها)

---

## 🚀 الاستخدام

```bash
# الأفلام (يحمّل movie_ids.json تلقائياً)
node scripts/ingestion/INGEST-MOVIES-V2.js

# المسلسلات (يحمّل tv_series_ids.json تلقائياً)
node scripts/ingestion/INGEST-SERIES-V2.js
```

**كل شيء تلقائي!** 🎉

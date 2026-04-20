# 📜 Scripts Documentation - دليل السكريبتات

**آخر تحديث:** 2026-04-19

---

## 📁 هيكل المجلدات

```
scripts/
├── archive/          # السكريبتات القديمة (محفوظة للرجوع)
├── ingestion/        # استيراد المحتوى من TMDB
├── services/         # خدمات مساعدة (AI, Translation)
├── utils/            # أدوات مساعدة (DB Connection)
└── *.js              # سكريبتات عامة
```

---

## 🎬 سكريبتات الاستيراد (ingestion/)

### الأساسية:

#### `INGEST-MOVIES.js`
**الوظيفة:** استيراد الأفلام من TMDB  
**الاستخدام:**
```bash
node scripts/ingestion/INGEST-MOVIES.js
```
**الميزات:**
- استيراد تلقائي من TMDB
- ترجمة تلقائية للعربية
- فلترة المحتوى
- معالجة بـ AI

#### `INGEST-SERIES.js`
**الوظيفة:** استيراد المسلسلات من TMDB  
**الاستخدام:**
```bash
node scripts/ingestion/INGEST-SERIES.js
```
**الميزات:**
- استيراد المسلسلات + المواسم + الحلقات
- ترجمة تلقائية
- معالجة الممثلين

---

### المساعدة:

#### `content-filter.js`
**الوظيفة:** فلترة المحتوى حسب القواعد  
**القواعد:**
- adult = false
- runtime ≥ 40 دقيقة (أفلام) / 25 دقيقة (مسلسلات)
- poster_path موجود
- genres مناسبة

#### `actor-translation-helper.js`
**الوظيفة:** ترجمة أسماء الممثلين للعربية

---

### SQL Migrations:

#### `01_create_content_tables.sql`
**الوظيفة:** إنشاء جداول المحتوى الأساسية

#### `02_create_cast_tables.sql`
**الوظيفة:** إنشاء جداول الممثلين والطاقم

#### `run-cast-tables-migration.js`
**الوظيفة:** تشغيل migration جداول الممثلين

---

## 🤖 خدمات AI (services/)

### `ai-moderator.js`
**الوظيفة:** فحص المحتوى بواسطة AI  
**الاستخدام:**
```bash
node scripts/services/ai-moderator.js
```
**الميزات:**
- فحص تلقائي للمحتوى
- استخدام Mistral AI
- تصنيف: approved/rejected/pending

### `translation-service.js`
**الوظيفة:** ترجمة النصوص للعربية  
**الاستخدام:**
```javascript
import { translateText } from './services/translation-service.js'
const arabicText = await translateText(englishText)
```

---

## 🛠️ أدوات مساعدة (utils/)

### `db-connection.js`
**الوظيفة:** إدارة الاتصال بـ CockroachDB  
**الاستخدام:**
```javascript
import { createPool, testConnection } from './utils/db-connection.js'
const pool = createPool()
await testConnection()
```

---

## 🗑️ سكريبتات الصيانة

### `delete-all-content.js`
**الوظيفة:** حذف جميع المحتوى من قاعدة البيانات  
**⚠️ تحذير:** خطير! يحذف كل شيء  
**الاستخدام:**
```bash
node scripts/delete-all-content.js
```

### `verify-empty-db.js`
**الوظيفة:** التحقق من أن قاعدة البيانات فارغة  
**الاستخدام:**
```bash
node scripts/verify-empty-db.js
```

### `translate-missing-overviews.js`
**الوظيفة:** ترجمة النبذات المفقودة  
**الاستخدام:**
```bash
node scripts/translate-missing-overviews.js
```

---

## 📦 Archive

السكريبتات القديمة محفوظة في `archive/` للرجوع إليها.

**لا تقم بتشغيلها** إلا إذا كنت متأكداً من الحاجة إليها.

---

## 🔧 Best Practices

### قبل تشغيل أي سكريبت:

1. **اقرأ الكود** - تأكد من فهمك لما يفعله
2. **اختبر على عينة صغيرة** - استخدم dry-run mode إن وُجد
3. **backup قاعدة البيانات** - احتياط دائماً
4. **راقب الـ logs** - تابع التنفيذ

### أثناء التشغيل:

- راقب استهلاك الـ API quota
- تحقق من الأخطاء في الكونسول
- استخدم Ctrl+C للإيقاف الآمن

### بعد التشغيل:

- تحقق من البيانات المُدخلة
- راجع الـ logs
- وثق أي مشاكل

---

**للمزيد:** راجع `.kiro/steering/` للقواعد والتوجيهات


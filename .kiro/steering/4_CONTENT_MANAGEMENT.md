# 📦 إدارة المحتوى

**آخر تحديث:** 2026-04-15  
**الأولوية:** 3 - مرجع

---

## 🔗 Slugs Generation

### القاعدة:
```javascript
// ✅ صحيح - استخدم الإنجليزية
const slug = generateSlug(title_en)
// "Powerpuff Girls Z" → "powerpuff-girls-z"

// ❌ خطأ - اللغة الأصلية تُحذف
const slug = generateSlug(original_title)
// "出ましたっ！パワパフガールズZ" → "z"
```

### لماذا؟
- SEO أفضل
- URLs قابلة للقراءة
- الأحرف غير الإنجليزية تُحذف تماماً

---

## 🚫 Content Filtering

### القواعد الإلزامية:

| الفلتر | الأفلام | المسلسلات |
|--------|---------|-----------|
| adult | false | false |
| runtime | ≥ 40 دقيقة | ≥ 25 دقيقة/حلقة |
| release_date | ≥ شهر واحد | ≥ شهر واحد |
| poster_path | موجود | موجود |
| genres | ليس Documentary/TV Movie | ليس Documentary/News/Talk |

### الاستخدام:
```javascript
import { shouldFilterContent } from './content-filter'

if (shouldFilterContent(movie, 'movie')) {
  console.log('تم رفض المحتوى')
  return
}
```

---

## 🤖 AI Moderation

### المراحل:
1. **Keyword Filter** - فحص الكلمات المفتاحية
2. **AI Analysis** - تحليل بواسطة Mistral AI
3. **Decision** - قبول/رفض/مراجعة

### الحالات:
- `approved` - مقبول
- `rejected` - مرفوض
- `pending` - قيد المراجعة
- `flagged` - محتوى مشبوه

### الاستخدام:
```bash
node scripts/moderate-content-batch-200.js
```

---

## 📥 Content Ingestion

### السكريبتات:
```bash
# أفلام عربية
node scripts/ingestion/02_seed_movies_arabic.js

# أفلام أجنبية
node scripts/ingestion/03_seed_movies_foreign.js

# مسلسلات
node scripts/ingestion/04_seed_tv_series.js

# أنمي
node scripts/ingestion/05_seed_anime.js
```

### الهدف:
- أفلام: 250,000
- مسلسلات: 250,000
- أنمي: 250,000
- **المجموع:** 1,000,000

---

**للمزيد:** راجع `CONTENT_INGESTION_RULES.md` (القديم)


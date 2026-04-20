# 🎯 أساسيات المشروع - CINMA

**آخر تحديث:** 2026-04-15  
**الأولوية:** CRITICAL - اقرأ هذا أولاً

---

## 🚨 القاعدة الذهبية (لا تخالفها أبداً!)

```
Supabase = Auth & User Data ONLY
CockroachDB = ALL Content (movies, tv_series, actors, etc.)
```

**تم انتهاك هذه القاعدة 100+ مرة. لا تكررها!**

---

## 📊 نظرة عامة سريعة

### ما هو المشروع؟
موقع لمشاهدة الأفلام والمسلسلات والأنمي أون لاين

### التقنيات:
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express
- **DB (Auth):** Supabase
- **DB (Content):** CockroachDB
- **APIs:** TMDB + Mistral AI

### الهدف:
- 1M+ محتوى
- 10M+ مستخدم
- $10M+ إيرادات سنوية

---

## 🔧 القواعد الحرجة (5 قواعد فقط)

### 1. Database
```typescript
// ❌ NEVER
await supabase.from('movies').select('*')

// ✅ ALWAYS
import { getMovies } from '../services/contentQueries'
const movies = await getMovies()
```

### 2. Toast
```typescript
// ❌ NEVER
import { toast } from 'sonner'

// ✅ ALWAYS
import { toast } from '../lib/toast-manager'
```

### 3. Slugs
```javascript
// ❌ NEVER (يحذف الأحرف غير الإنجليزية)
generateSlug(original_title)

// ✅ ALWAYS
generateSlug(title_en)
```

### 4. Titles
```typescript
// ❌ NEVER: 3 لغات
<h1>{title_ar}</h1>
<h2>{title_en}</h2>
<h3>{original_title}</h3>

// ✅ ALWAYS: لغتين فقط
const titles = useTripleTitles(movie)
<h1>{titles.primary}</h1>
{titles.hasMultipleTitles && <h2>{titles.arabic || titles.english}</h2>}
```

### 5. Images
```typescript
// ❌ NEVER
priority={true}

// ✅ ALWAYS
priority={index < 6 || isVisible}
```

---

## 📁 هيكل المشروع (مبسط)

```
src/
├── components/common/    # OptimizedImage, SeoHead
├── components/features/  # MovieCard, QuantumTrain
├── hooks/                # useTripleTitles, useDualTitles
├── services/             # contentQueries, contentAPI
├── lib/                  # toast-manager, supabase
└── pages/                # Watch, Home, etc.

server/
├── routes/content.js     # API endpoints (CockroachDB)
└── index.js              # Express server

scripts/
├── ingestion/            # استيراد من TMDB
├── services/             # AI Moderation
└── fix-*.js              # تصليحات
```

---

## 🎯 المهام الحالية

### عاجل (هذا الأسبوع):
- Primary Genre (30 دقيقة)
- AI Moderation (200 عنصر)
- اختبار شامل

### قريب (هذا الشهر):
- استيراد 10K محتوى
- معالجة بـ AI
- تحسين الأداء

---

## 📚 الملفات المهمة

### للبدء:
1. `.kiro/steering/PROJECT_ESSENTIALS.md` (هذا الملف)
2. `.kiro/steering/CORE_DIRECTIVES.md`
3. `.kiro/steering/database-architecture.md`

### للتفاصيل:
- `QUICK_START_GUIDE.md` (في الجذر)
- `PROJECT_COMPLETE_HANDOVER.md` (في الجذر)
- `TECHNICAL_DETAILS_HANDOVER.md` (في الجذر)

---

## 🔧 الأوامر السريعة

```bash
# Development
npm run dev              # Frontend
npm run server           # Backend

# Testing
node scripts/verify-all-fixes.js

# Ingestion
node scripts/ingestion/02_seed_movies_arabic.js

# Fixes
node scripts/fix-primary-genre.js
```

---

## 💡 نصائح سريعة

1. **اقرأ القواعد أولاً** - لا تبدأ الكود قبل قراءة `.kiro/steering/`
2. **لا تخالف القاعدة الذهبية** - Supabase = Auth فقط
3. **استخدم السكريبتات الموجودة** - لا تعيد اختراع العجلة
4. **اختبر على عينة صغيرة** - استخدم dry-run mode
5. **وثق التغييرات** - أضف تعليقات واضحة

---

## ✅ Checklist للبدء

- [ ] قرأت هذا الملف
- [ ] قرأت CORE_DIRECTIVES.md
- [ ] قرأت database-architecture.md
- [ ] فهمت القاعدة الذهبية
- [ ] اختبرت الاتصال بـ CockroachDB
- [ ] جاهز للعمل! 🚀

---

**هذا الملف يوفر 80% من المعلومات الأساسية في 20% من الوقت!**


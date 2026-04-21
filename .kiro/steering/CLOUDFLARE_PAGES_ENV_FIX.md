# 🔧 إصلاح Cloudflare Pages - Environment Variables

**تاريخ الاكتشاف:** 2026-04-21  
**الحالة:** 🔴 CRITICAL - الموقع لا يعرض محتوى  
**الأولوية:** URGENT

---

## 🔍 المشكلة الحقيقية

الموقع على Cloudflare Pages لا يعرض أي محتوى بسبب **عدم وجود متغير البيئة `VITE_API_BASE`**.

### الأعراض:
- ✅ الباك اند يعمل على Koyeb بشكل صحيح
- ✅ قاعدة البيانات تحتوي على محتوى (16K فيلم + 9K مسلسل)
- ✅ `/api/home` endpoint يعمل ويرجع بيانات
- ❌ الفرونت اند لا يعرض أي محتوى
- ❌ لا توجد أخطاء في الكونسول (فقط 405 من `/api/log`)

### السبب الجذري:
```typescript
// في src/lib/constants.ts
export const CONFIG = {
  API_BASE: import.meta.env.VITE_API_BASE || envVar('VITE_API_BASE') || runtimeConfig.VITE_API_BASE || ''
  //                                                                                                    ^^
  //                                                                                                    المشكلة هنا!
}
```

عندما `VITE_API_BASE` غير موجود، يستخدم `''` (empty string)، مما يعني:
```javascript
// ❌ الكود الحالي يحاول
fetch('/api/home')  // على cinma.pages.dev (لا يوجد backend هناك!)

// ✅ يجب أن يكون
fetch('https://cooperative-nevsa-cinma-71a99c5c.koyeb.app/api/home')
```

---

## ✅ الحل الفوري

### الخطوة 1: إضافة Environment Variables في Cloudflare Pages

1. **اذهب إلى Cloudflare Dashboard:**
   - https://dash.cloudflare.com/
   - اختر Account
   - اختر Pages
   - اختر Project: `cinma`

2. **اذهب إلى Settings → Environment Variables**

3. **أضف المتغيرات التالية:**

#### للـ Production:
```
VITE_API_BASE=https://cooperative-nevsa-cinma-71a99c5c.koyeb.app
VITE_API_URL=https://cooperative-nevsa-cinma-71a99c5c.koyeb.app
VITE_SUPABASE_URL=https://lhpuwupbhpcqkwqugkhh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkyODgsImV4cCI6MjA4NjQ4NTI4OH0.QCYzJaWo0mmFQwZjwaNjIJR1jR4wOb4CbqTKxTAaO2w
VITE_TMDB_API_KEY=afef094e7c0de13c1cac98227a61da4d
VITE_SITE_NAME=اونلاين سينما
VITE_DOMAIN=cinma.online
VITE_SITE_URL=https://cinma.online
```

#### للـ Preview (اختياري):
نفس القيم أعلاه

4. **احفظ التغييرات**

5. **Redeploy:**
   - اذهب إلى Deployments
   - اختر آخر deployment
   - اضغط "Retry deployment"
   - أو push أي commit جديد

---

### الخطوة 2: التحقق من النجاح

بعد Redeploy، افتح الموقع:
- https://cinma.pages.dev

يجب أن ترى:
- ✅ المحتوى يظهر (أفلام ومسلسلات)
- ✅ لا أخطاء في الكونسول
- ✅ الصفحة الرئيسية تعمل

---

## 🔧 التحقق من المتغيرات

### في Cloudflare Pages Dashboard:

1. اذهب إلى: Settings → Environment Variables
2. تأكد من وجود:
   - `VITE_API_BASE` = `https://cooperative-nevsa-cinma-71a99c5c.koyeb.app`
   - `VITE_SUPABASE_URL` = `https://lhpuwupbhpcqkwqugkhh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJ...`
   - `VITE_TMDB_API_KEY` = `afef...`

### في الكونسول (بعد Redeploy):

افتح Developer Tools → Console واكتب:
```javascript
console.log(window.__RUNTIME_CONFIG__)
```

يجب أن ترى:
```javascript
{
  VITE_API_BASE: "https://cooperative-nevsa-cinma-71a99c5c.koyeb.app",
  // ...
}
```

---

## 📊 التأثير

### قبل الإصلاح:
```
Frontend (cinma.pages.dev)
    ↓
    ❌ fetch('/api/home')  // لا يوجد backend على Pages!
    ↓
    ❌ لا محتوى
```

### بعد الإصلاح:
```
Frontend (cinma.pages.dev)
    ↓
    ✅ fetch('https://cooperative-nevsa-cinma-71a99c5c.koyeb.app/api/home')
    ↓
    ✅ Backend (Koyeb)
    ↓
    ✅ CockroachDB
    ↓
    ✅ محتوى يظهر!
```

---

## 🎯 الخطوات التالية

بعد إضافة المتغيرات:

1. ✅ Redeploy على Cloudflare Pages
2. ✅ تحقق من عمل الموقع
3. ✅ اختبر الصفحة الرئيسية
4. ✅ اختبر صفحات الأفلام والمسلسلات
5. ✅ تأكد من عدم وجود أخطاء في الكونسول

---

## 📝 ملاحظات مهمة

### 1. لماذا لم تظهر أخطاء في الكونسول؟

لأن الكود يستخدم try/catch ويرجع array فارغ عند الفشل:
```typescript
try {
  const response = await fetch('/api/home')
  // ...
} catch (error) {
  logger.error('Failed to fetch', error)  // يظهر فقط في development
  return { results: [] }  // array فارغ = لا محتوى
}
```

### 2. لماذا 405 من `/api/log`؟

لأن Cloudflare Pages لا يدعم POST requests للـ API routes. هذا غير حرج - فقط logging.

### 3. هل يجب تحديث GitHub Secrets؟

لا، GitHub Secrets تُستخدم فقط للـ GitHub Actions. Cloudflare Pages يستخدم Environment Variables الخاصة به.

---

## 🚀 البديل: Auto-Deploy من GitHub

إذا كنت تريد تجنب إضافة المتغيرات يدوياً:

1. **اربط Cloudflare Pages مع GitHub:**
   - في Cloudflare Dashboard → Pages
   - اختر "Connect to Git"
   - اختر Repository: `Iaaelsadek/cinma`
   - Branch: `main`

2. **أضف Build Settings:**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`

3. **أضف Environment Variables** (نفس القائمة أعلاه)

4. **احفظ واعمل Deploy**

الآن كل push إلى `main` سيعمل auto-deploy تلقائياً!

---

**تم التوثيق بواسطة:** Kiro AI  
**التاريخ:** 2026-04-21  
**الحالة:** 🔴 URGENT - يحتاج تطبيق فوري

# 🚀 دليل إعداد الـ Deployment

**آخر تحديث:** 2026-04-20  
**الحالة:** محدّث للبنية الحالية

---

## 📊 البنية الحالية

```
GitHub (المخزن الرئيسي)
    ↓
    ├─→ Cloudflare Pages (Frontend - React)
    └─→ Koyeb (Backend - Node.js/Express)
```

---

## 🔄 كيف يعمل الـ Deployment؟

### الطريقة الحالية (الموصى بها):

1. **تعمل push للكود على GitHub**
   ```bash
   git add .
   git commit -m "your message"
   git push origin main
   ```

2. **Cloudflare Pages يكتشف الـ push تلقائياً**
   - يبني الـ Frontend
   - ينشره على Cloudflare CDN
   - ✅ لا تحتاج GitHub Action

3. **Koyeb يكتشف الـ push تلقائياً**
   - يبني الـ Backend
   - ينشره على Koyeb
   - ✅ لا تحتاج GitHub Action

### الطريقة البديلة (عبر GitHub Actions):

إذا أردت التحكم الكامل من GitHub Actions:

1. **أضف الـ Secrets المطلوبة:**
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `KOYEB_API_TOKEN`

2. **الـ Workflow سيشتغل تلقائياً:**
   - عند كل push على `main`
   - يبني ويرفع Frontend لـ Cloudflare
   - يبني ويرفع Backend لـ Koyeb

---

## 🎯 ما المطلوب منك الآن؟

### السيناريو 1: Auto-Deploy مفعّل (الأسهل)

إذا كان Cloudflare و Koyeb متصلين بـ GitHub بالفعل:

✅ **لا تحتاج أي شيء!**
- فقط اعمل push للكود
- كل شيء سيتم تلقائياً

### السيناريو 2: تريد GitHub Actions (تحكم أكبر)

إذا أردت التحكم من GitHub Actions:

1. **احصل على الـ Tokens:**
   - Cloudflare API Token
   - Koyeb API Token

2. **أضفهم كـ GitHub Secrets:**
   ```bash
   # استخدم السكريبت
   bash scripts/setup-github-secrets.sh
   
   # ثم أضف الناقصين يدوياً
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set CLOUDFLARE_ACCOUNT_ID
   gh secret set KOYEB_API_TOKEN
   ```

3. **الـ Workflow جاهز:**
   - `.github/workflows/deploy.yml` محدّث
   - سيشتغل تلقائياً عند push

---

## 🔍 كيف تعرف أي سيناريو أنت فيه؟

### تحقق من Cloudflare:

1. اذهب إلى: https://dash.cloudflare.com/
2. اختر **Pages** من القائمة
3. ابحث عن مشروعك (`cinma-online`)
4. إذا وجدته متصل بـ GitHub → **Auto-deploy مفعّل** ✅

### تحقق من Koyeb:

1. اذهب إلى: https://app.koyeb.com/
2. اختر **Services**
3. ابحث عن الـ backend service
4. إذا وجدته متصل بـ GitHub → **Auto-deploy مفعّل** ✅

---

## 📋 الـ Secrets المطلوبة

### للـ Build فقط (موجودة):

| Secret | الحالة | الاستخدام |
|--------|--------|-----------|
| `COCKROACHDB_URL` | ✅ موجود | Database |
| `VITE_TMDB_API_KEY` | ✅ موجود | TMDB API |
| `VITE_SUPABASE_URL` | ✅ موجود | Auth |
| `VITE_SUPABASE_ANON_KEY` | ✅ موجود | Auth |
| `VITE_GROQ_API_KEY` | ✅ موجود | AI Chatbot |
| `VITE_GEMINI_API_KEY` | ✅ موجود | AI Chatbot |

### للـ Deployment (اختيارية):

| Secret | الحالة | متى تحتاجه |
|--------|--------|------------|
| `CLOUDFLARE_API_TOKEN` | ❌ ناقص | إذا أردت GitHub Action للـ frontend |
| `CLOUDFLARE_ACCOUNT_ID` | ❌ ناقص | إذا أردت GitHub Action للـ frontend |
| `KOYEB_API_TOKEN` | ❌ ناقص | إذا أردت GitHub Action للـ backend |

---

## 🚦 الحالة الحالية للـ Workflow

### ما يعمل الآن:

- ✅ **Lint** - فحص الكود
- ✅ **TypeCheck** - فحص TypeScript
- ✅ **Test** - اختبارات الوحدة
- ✅ **Build** - بناء المشروع

### ما سيتخطى (بدون secrets):

- ⚠️ **Deploy Frontend** - سيتخطى إذا لم تضف Cloudflare secrets
- ⚠️ **Deploy Backend** - سيتخطى إذا لم تضف Koyeb token

**ملاحظة:** التخطي ليس خطأ! الـ workflow سيكمل بنجاح.

---

## 🎯 التوصية

### للبداية (الأسهل):

1. **تأكد من Auto-Deploy مفعّل** في Cloudflare و Koyeb
2. **اعمل push للكود** على GitHub
3. **راقب الـ deployment** في dashboards الخاصة بهم
4. ✅ **لا تحتاج GitHub Secrets للـ deployment**

### للتحكم الكامل (متقدم):

1. **أضف الـ Secrets** حسب الدليل
2. **الـ GitHub Action ستتولى كل شيء**
3. **راقب الـ deployment** من GitHub Actions tab

---

## 📚 الأدلة المساعدة

- **إضافة Secrets:** `docs/GITHUB_SECRETS_GUIDE.md`
- **إعداد Koyeb Environment Variables:** `docs/KOYEB_ENV_SETUP.md` ⭐ **جديد!**
- **Cloudflare Setup:** [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- **Koyeb Setup:** [Koyeb GitHub Integration](https://www.koyeb.com/docs/build-and-deploy/github)

---

## 🆘 المساعدة

### إذا الـ deployment لا يعمل:

1. **تحقق من الـ logs:**
   - Cloudflare: Dashboard → Pages → Deployments
   - Koyeb: Dashboard → Services → Logs

2. **تحقق من الاتصال بـ GitHub:**
   - تأكد من الـ repo متصل
   - تأكد من الـ branch صحيح (`main`)

3. **تحقق من الـ build settings:**
   - Cloudflare: Build command = `npm run build`
   - Koyeb: Start command = `npm run server`

4. **إذا Koyeb يفشل بـ "COCKROACHDB_URL not set":**
   - اتبع الدليل الشامل: `docs/KOYEB_ENV_SETUP.md`
   - أضف جميع Environment Variables في Koyeb Dashboard
   - Redeploy بعد الإضافة

---

**تم الإنشاء بواسطة:** Kiro AI  
**التاريخ:** 2026-04-20

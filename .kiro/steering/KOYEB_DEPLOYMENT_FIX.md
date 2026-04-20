# 🔧 إصلاح Koyeb Deployment - Environment Variables

**تاريخ التطبيق:** 2026-04-20  
**الحالة:** ✅ موثق - جاهز للتطبيق  
**الأولوية:** CRITICAL

---

## 🚨 المشكلة

الباك اند على Koyeb بيفشل بالخطأ التالي:

```
❌ COCKROACHDB_URL environment variable is not set
Check .env.local or .env file
Application exited with code 1
```

**السبب الجذري:**
- الكود في `src/db/pool.js` بيعمل `process.exit(1)` لو `COCKROACHDB_URL` مش موجود
- Koyeb مش بيقرأ `.env` أو `.env.local` في production
- Environment variables لازم تتضاف في Koyeb Dashboard يدوياً

---

## ✅ الحل

### الخطوات المطلوبة:

1. **افتح Koyeb Dashboard:**
   - https://app.koyeb.com/
   - اختر service الباك اند

2. **اذهب إلى Settings → Environment Variables**

3. **أضف المتغيرات المطلوبة:**
   - `COCKROACHDB_URL` (من `.env`)
   - `VITE_SUPABASE_URL` (من `.env`)
   - `VITE_SUPABASE_ANON_KEY` (من `.env`)
   - `TMDB_API_KEY` (من `.env`)
   - `MISTRAL_API_KEY` (من `.env`)
   - `NODE_ENV=production`
   - `PORT=8080`
   - `HOST=0.0.0.0`

4. **احفظ واعمل Redeploy**

---

## 📚 الدليل الشامل

للتعليمات التفصيلية خطوة بخطوة، راجع:

**`docs/KOYEB_ENV_SETUP.md`**

هذا الدليل يحتوي على:
- ✅ خطوات مفصلة بالصور
- ✅ قائمة كاملة بالمتغيرات المطلوبة
- ✅ استكشاف الأخطاء الشائعة
- ✅ كيفية الحصول على القيم من `.env`
- ✅ التحقق من نجاح النشر

---

## 🔍 التحقق من النجاح

### في Koyeb Logs يجب أن تشوف:

```
🚀 Cinema.online Server running on 0.0.0.0:8080
📚 API Docs: http://0.0.0.0:8080/api-docs
🗄️  Database: CockroachDB (Primary Content)
🔐 Auth: Supabase (User Data Only)
```

### لا يجب أن تشوف:

```
❌ COCKROACHDB_URL environment variable is not set
Application exited with code 1
```

---

## 📝 الملفات ذات الصلة

### الكود:
- `src/db/pool.js` - يفحص وجود `COCKROACHDB_URL`
- `server/index.js` - يستخدم pool للاتصال بالـ database
- `Dockerfile` - يحدد PORT و HOST

### التوثيق:
- `docs/KOYEB_ENV_SETUP.md` - الدليل الشامل ⭐
- `docs/DEPLOYMENT_SETUP.md` - نظرة عامة على النشر
- `docs/GITHUB_SECRETS_GUIDE.md` - إضافة secrets لـ GitHub Actions

---

## 🎯 ملاحظات مهمة

### عن Environment Variables في Production:

1. **لا يتم قراءة .env في production:**
   - Koyeb لا يقرأ `.env` أو `.env.local`
   - يجب إضافة المتغيرات في Dashboard

2. **الأمان:**
   - لا تضع secrets في الكود
   - استخدم Koyeb Dashboard لإضافة المتغيرات الحساسة
   - المتغيرات مشفرة في Koyeb

3. **Redeploy مطلوب:**
   - بعد أي تغيير في Environment Variables
   - Redeploy يأخذ 2-3 دقائق

---

## 🐛 الأخطاء الشائعة

### 1. "COCKROACHDB_URL not set"
**الحل:** أضف المتغير في Koyeb Dashboard

### 2. "Application exited with code 1"
**الحل:** تحقق من Logs لمعرفة المتغير الناقص

### 3. "Connection timeout"
**الحل:** تحقق من صحة connection string

---

## 🚀 الخطوات التالية

بعد إضافة Environment Variables:

1. ✅ Redeploy على Koyeb
2. ✅ راقب Logs للتأكد من النجاح
3. ✅ اختبر API endpoints
4. ✅ تأكد من اتصال CockroachDB
5. ✅ اختبر Frontend مع Backend

---

**تم التوثيق بواسطة:** Kiro AI  
**التاريخ:** 2026-04-20  
**الحالة:** جاهز للتطبيق - اتبع `docs/KOYEB_ENV_SETUP.md`

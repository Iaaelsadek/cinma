# 🔧 إعداد Environment Variables على Koyeb

**آخر تحديث:** 2026-04-20  
**الحالة:** ✅ دليل شامل لحل مشكلة COCKROACHDB_URL

---

## 🚨 المشكلة

الباك اند على Koyeb بيفشل بالخطأ التالي:

```
❌ COCKROACHDB_URL environment variable is not set
Check .env.local or .env file
Application exited with code 1
```

**السبب:** Environment variables مش موجودة في Koyeb Dashboard

---

## ✅ الحل (خطوة بخطوة)

### الخطوة 1: افتح Koyeb Dashboard

1. اذهب إلى: https://app.koyeb.com/
2. سجل الدخول بحسابك

### الخطوة 2: اختر Service

1. من القائمة الجانبية، اختر **"Services"**
2. اضغط على service الباك اند (مثلاً: `cinma-backend`)

### الخطوة 3: افتح Settings

1. في صفحة الـ service، اضغط على تبويب **"Settings"**
2. ابحث عن قسم **"Environment Variables"**

### الخطوة 4: أضف Environment Variables

اضغط **"Add Variable"** وأضف المتغيرات التالية واحد واحد:

#### 1. Database (CRITICAL - الأهم):
```
Name: COCKROACHDB_URL
Value: postgresql://cinma-db:YOUR_PASSWORD@prying-squid-23421.j77.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```
⚠️ **استبدل `YOUR_PASSWORD` بكلمة المرور الفعلية من `.env` file**

#### 2. Supabase (Auth):
```
Name: VITE_SUPABASE_URL
Value: https://lhpuwupbhpcqkwqugkhh.supabase.co
```

```
Name: VITE_SUPABASE_ANON_KEY
Value: YOUR_SUPABASE_ANON_KEY
```
⚠️ **احصل على القيمة من `.env` file**

#### 3. TMDB API:
```
Name: TMDB_API_KEY
Value: YOUR_TMDB_API_KEY
```
⚠️ **احصل على القيمة من `.env` file**

#### 4. Mistral AI (للترجمة):
```
Name: MISTRAL_API_KEY
Value: YOUR_MISTRAL_API_KEY
```
⚠️ **احصل على القيمة من `.env` file**

#### 5. Node Environment:
```
Name: NODE_ENV
Value: production
```

```
Name: PORT
Value: 8080
```

```
Name: HOST
Value: 0.0.0.0
```

### الخطوة 5: احفظ التغييرات

1. بعد إضافة كل المتغيرات، اضغط **"Save"** أو **"Update"**
2. ستظهر رسالة تأكيد

### الخطوة 6: Redeploy

1. في نفس صفحة الـ service، اضغط **"Redeploy"** أو **"Restart"**
2. انتظر 2-3 دقائق حتى يكتمل البناء

---

## 🔍 التحقق من النجاح

### 1. شوف Logs

1. في Koyeb Dashboard، اذهب إلى تبويب **"Logs"**
2. انتظر حتى يبدأ الـ deployment

**يجب أن تشوف:**
```
🚀 4Cima Server running on 0.0.0.0:8080
📚 API Docs: http://0.0.0.0:8080/api-docs
🗄️  Database: CockroachDB (Primary Content)
🔐 Auth: Supabase (User Data Only)
```

**لا يجب أن تشوف:**
```
❌ COCKROACHDB_URL environment variable is not set
Application exited with code 1
```

### 2. اختبر API

افتح المتصفح أو استخدم curl:

```bash
# Health Check
curl https://your-app.koyeb.app/health

# Test Movies API
curl https://your-app.koyeb.app/api/movies?page=1&limit=10
```

---

## 📋 قائمة Environment Variables الكاملة

| المتغير | الوصف | مطلوب؟ | القيمة |
|---------|--------|--------|--------|
| `COCKROACHDB_URL` | CockroachDB connection string | ✅ نعم | من `.env` |
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ نعم | من `.env` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | ✅ نعم | من `.env` |
| `TMDB_API_KEY` | TMDB API key | ✅ نعم | من `.env` |
| `MISTRAL_API_KEY` | Mistral AI key | ✅ نعم | من `.env` |
| `NODE_ENV` | production | ✅ نعم | `production` |
| `PORT` | 8080 | ✅ نعم | `8080` |
| `HOST` | 0.0.0.0 | ⚠️ موصى به | `0.0.0.0` |
| `ADMIN_KEY` | Admin API key | ❌ اختياري | من `.env` |

---

## 🐛 استكشاف الأخطاء الشائعة

### خطأ 1: "COCKROACHDB_URL environment variable is not set"

**الأسباب المحتملة:**
- لم تضف المتغير في Koyeb Dashboard
- المتغير به مسافات زائدة
- لم تعمل Redeploy بعد الإضافة

**الحل:**
1. تأكد من إضافة `COCKROACHDB_URL` بالضبط (بدون مسافات)
2. تأكد من صحة القيمة (connection string كامل)
3. اضغط **"Redeploy"** بعد الإضافة

### خطأ 2: "Application exited with code 1"

**الأسباب المحتملة:**
- أحد المتغيرات المطلوبة ناقص
- connection string خاطئ
- كلمة المرور خاطئة

**الحل:**
1. شوف Logs في Koyeb Dashboard
2. تأكد من وجود جميع المتغيرات المطلوبة (✅ نعم)
3. تأكد من صحة connection string
4. جرب نسخ القيم من `.env` مباشرة

### خطأ 3: "Connection timeout" أو "ECONNREFUSED"

**الأسباب المحتملة:**
- CockroachDB cluster مش شغال
- IP address خاطئ في connection string
- SSL settings خاطئة

**الحل:**
1. تأكد من أن CockroachDB cluster شغال
2. تأكد من صحة connection string (انسخه من CockroachDB Dashboard)
3. تأكد من وجود `?sslmode=verify-full` في نهاية connection string

### خطأ 4: "Invalid API key" (TMDB أو Mistral)

**الأسباب المحتملة:**
- API key خاطئ
- API key منتهي الصلاحية
- مسافات زائدة في القيمة

**الحل:**
1. تأكد من صحة API keys
2. جرب إنشاء API key جديد
3. تأكد من عدم وجود مسافات في البداية أو النهاية

---

## 📝 ملاحظات مهمة

### عن Docker:
- Koyeb يستخدم `Dockerfile` تلقائياً
- لا حاجة لتحديد build command
- الـ `Dockerfile` موجود في الجذر

### عن Port:
- Port 8080 هو الافتراضي لـ Koyeb
- يجب أن يكون HOST=0.0.0.0 (مهم!)
- الـ `Dockerfile` يحدد هذه القيم تلقائياً

### عن Environment Variables:
- يجب إضافتها في Koyeb Dashboard (ليس في .env)
- لا يتم قراءة .env أو .env.local في production
- Koyeb يحقن المتغيرات في runtime

### عن Redeploy:
- بعد أي تغيير في Environment Variables، لازم Redeploy
- Redeploy يأخذ 2-3 دقائق
- يمكنك متابعة التقدم في تبويب "Logs"

---

## 🎯 كيف تحصل على القيم من .env؟

### في Windows (PowerShell):

```powershell
# اعرض محتوى .env
Get-Content .env

# أو افتح الملف في محرر نصوص
notepad .env
```

### في Linux/Mac:

```bash
# اعرض محتوى .env
cat .env

# أو افتح الملف في محرر نصوص
nano .env
```

### القيم المطلوبة:

ابحث عن هذه الأسطر في `.env`:

```env
COCKROACHDB_URL=postgresql://...
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
TMDB_API_KEY=...
MISTRAL_API_KEY=...
```

انسخ القيمة بعد `=` مباشرة (بدون مسافات)

---

## 🚀 الخطوات التالية

بعد نجاح النشر:

1. ✅ اختبر جميع API endpoints
2. ✅ تأكد من اتصال CockroachDB
3. ✅ تأكد من اتصال Supabase
4. ✅ اختبر الترجمة التلقائية (Mistral AI)
5. ✅ راقب Logs لأي أخطاء
6. ✅ اختبر Frontend مع Backend الجديد

---

## 📞 المساعدة

إذا واجهت أي مشكلة:

1. **شوف Logs أولاً** - معظم المشاكل واضحة في Logs
2. **تأكد من القيم** - انسخ من `.env` مباشرة
3. **Redeploy** - بعد أي تغيير
4. **اختبر محلياً** - تأكد من أن الكود يعمل محلياً أولاً

---

**تم الإنشاء بواسطة:** Kiro AI  
**التاريخ:** 2026-04-20  
**الحالة:** جاهز للتطبيق - اتبع الخطوات بالترتيب

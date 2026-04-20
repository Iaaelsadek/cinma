# 🔐 دليل إعداد GitHub Secrets

**آخر تحديث:** 2026-04-20  
**الحالة:** دليل شامل

---

## 📋 جدول المحتويات

1. [الـ Secrets الموجودة](#الـ-secrets-الموجودة)
2. [الـ Secrets الناقصة](#الـ-secrets-الناقصة)
3. [طريقة الإضافة التلقائية](#طريقة-الإضافة-التلقائية)
4. [طريقة الإضافة اليدوية](#طريقة-الإضافة-اليدوية)
5. [الحصول على Cloudflare Secrets](#الحصول-على-cloudflare-secrets)
6. [الحصول على Koyeb Secrets](#الحصول-على-koyeb-secrets)

---

## ✅ الـ Secrets الموجودة

هذه الـ secrets موجودة في `.env` وجاهزة للإضافة:

| Secret Name | الاستخدام | الأولوية |
|-------------|-----------|----------|
| `COCKROACHDB_URL` | قاعدة بيانات المحتوى | 🔴 CRITICAL |
| `VITE_TMDB_API_KEY` | TMDB API للمحتوى | 🔴 CRITICAL |
| `MISTRAL_API_KEY` | ترجمة AI | 🟡 HIGH |
| `VITE_SUPABASE_URL` | Auth | 🔴 CRITICAL |
| `VITE_SUPABASE_ANON_KEY` | Auth | 🔴 CRITICAL |
| `VITE_GROQ_API_KEY` | Chatbot | 🟢 MEDIUM |
| `VITE_GEMINI_API_KEY` | Chatbot fallback | 🟢 MEDIUM |
| `VITE_SITE_URL` | Site URL | 🟡 HIGH |
| `VITE_SITE_NAME` | Site name | 🟢 MEDIUM |
| `VITE_DOMAIN` | Domain | 🟢 MEDIUM |
| `VITE_API_KEY` | API key | 🟡 HIGH |

---

## ❌ الـ Secrets الناقصة

هذه الـ secrets مطلوبة لكن غير موجودة في `.env`:

### Cloudflare (Frontend Deployment):

| Secret Name | الاستخدام |
|-------------|-----------|
| `CLOUDFLARE_API_TOKEN` | Deploy to Cloudflare Pages |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

### Koyeb (Backend Deployment):

| Secret Name | الاستخدام |
|-------------|-----------|
| `KOYEB_API_TOKEN` | Deploy to Koyeb |

### Koyeb (Backend Deployment):

| Secret Name | الاستخدام |
|-------------|-----------|
| `KOYEB_API_TOKEN` | Deploy to Koyeb |

---

## 🚀 طريقة الإضافة التلقائية

### المتطلبات:
1. **GitHub CLI** مثبت: https://cli.github.com/
2. مصادقة مع GitHub: `gh auth login`

### الخطوات:

```bash
# 1. اجعل السكريبت قابل للتنفيذ
chmod +x scripts/setup-github-secrets.sh

# 2. شغل السكريبت
bash scripts/setup-github-secrets.sh
```

### ماذا يفعل السكريبت؟
- ✅ يقرأ `.env` تلقائياً
- ✅ يضيف جميع الـ secrets الموجودة إلى GitHub
- ✅ يتخطى القيم الفارغة
- ✅ يعرض قائمة بالـ secrets الناقصة

---

## 🖱️ طريقة الإضافة اليدوية

### عبر GitHub Web Interface:

1. اذهب إلى: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. اضغط **"New repository secret"**
3. أدخل:
   - **Name:** اسم الـ secret (مثل: `COCKROACHDB_URL`)
   - **Value:** القيمة من `.env`
4. اضغط **"Add secret"**
5. كرر لكل secret

### عبر GitHub CLI:

```bash
# مثال: إضافة COCKROACHDB_URL
gh secret set COCKROACHDB_URL

# سيطلب منك إدخال القيمة
# أو يمكنك تمريرها مباشرة:
echo "YOUR_VALUE" | gh secret set COCKROACHDB_URL
```

---

## ☁️ الحصول على Cloudflare Secrets

### 1. CLOUDFLARE_API_TOKEN

**الخطوات:**

1. اذهب إلى: https://dash.cloudflare.com/profile/api-tokens
2. اضغط **"Create Token"**
3. اختر **"Edit Cloudflare Workers"** template
4. أو أنشئ Custom Token مع الصلاحيات:
   - **Account** → **Cloudflare Pages** → **Edit**
5. انسخ الـ Token (يظهر مرة واحدة فقط!)

**الصلاحيات المطلوبة:**
```
Zone:
  - Cloudflare Pages: Edit

Account:
  - Cloudflare Pages: Edit
```

### 2. CLOUDFLARE_ACCOUNT_ID

**الخطوات:**

1. اذهب إلى: https://dash.cloudflare.com/
2. اختر أي موقع
3. انظر إلى الـ URL:
   ```
   https://dash.cloudflare.com/YOUR_ACCOUNT_ID/...
   ```
4. انسخ `YOUR_ACCOUNT_ID`

**أو:**

1. اذهب إلى: https://dash.cloudflare.com/
2. في الـ sidebar الأيسر، اضغط على اسم الـ Account
3. ستجد **Account ID** في الصفحة

---

## 🚢 الحصول على Koyeb Secrets

### KOYEB_API_TOKEN

**الخطوات:**

1. اذهب إلى: https://app.koyeb.com/
2. اضغط على اسمك (أعلى اليمين)
3. اختر **"Settings"** → **"API"**
4. اضغط **"Create API Token"**
5. أدخل اسم للـ Token (مثل: `GitHub Actions`)
6. اختر الصلاحيات: **Full Access** أو **Deploy**
7. انسخ الـ Token (يظهر مرة واحدة فقط!)

**ملاحظة:**
- Koyeb يتصل تلقائياً بـ GitHub
- بمجرد ربط الـ repo، سيتم الـ deploy تلقائياً عند كل push
- لا تحتاج IDs إضافية (فقط الـ Token)

**البديل - Auto Deploy من GitHub:**

إذا كنت قد ربطت Koyeb بـ GitHub بالفعل:
1. Koyeb سيكتشف الـ push تلقائياً
2. لا تحتاج GitHub Action للـ backend
3. يمكنك حذف `deploy-backend` job من الـ workflow

---

## 🔍 التحقق من الـ Secrets

### عبر GitHub CLI:

```bash
# عرض جميع الـ secrets
gh secret list

# التحقق من secret معين
gh secret list | grep COCKROACHDB_URL
```

### عبر GitHub Web:

1. اذهب إلى: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. ستجد قائمة بجميع الـ secrets
3. لا يمكنك رؤية القيم (أمان)، لكن يمكنك رؤية الأسماء وتاريخ آخر تحديث

---

## ✅ Checklist

### الـ Secrets الموجودة (من .env):
- [ ] `COCKROACHDB_URL`
- [ ] `VITE_TMDB_API_KEY`
- [ ] `MISTRAL_API_KEY`
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_GROQ_API_KEY`
- [ ] `VITE_GEMINI_API_KEY`
- [ ] `VITE_SITE_URL`
- [ ] `VITE_SITE_NAME`
- [ ] `VITE_DOMAIN`
- [ ] `VITE_API_KEY`

### الـ Secrets الناقصة (محتاج تحصل عليها):
- [ ] `CLOUDFLARE_API_TOKEN`
- [ ] `CLOUDFLARE_ACCOUNT_ID`
- [ ] `KOYEB_API_TOKEN` (اختياري - إذا لم يكن auto-deploy مفعّل)

---

## 🚨 ملاحظات أمان

1. **لا تشارك الـ secrets أبداً** - لا في commits، لا في screenshots
2. **استخدم .env.local** - للتطوير المحلي فقط
3. **أضف .env إلى .gitignore** - (موجود بالفعل)
4. **قم بتدوير الـ tokens** - كل 3-6 أشهر
5. **استخدم صلاحيات محدودة** - أقل صلاحيات ممكنة

---

## 🆘 المساعدة

### إذا واجهت مشاكل:

1. **GitHub CLI لا يعمل:**
   ```bash
   gh auth status
   gh auth login
   ```

2. **Secret لا يظهر في Workflow:**
   - تأكد من الاسم صحيح (case-sensitive)
   - تأكد من إضافته في Repository Secrets (ليس Environment Secrets)

3. **Cloudflare Token لا يعمل:**
   - تأكد من الصلاحيات صحيحة
   - تأكد من الـ Token لم ينتهي

4. **Koyeb Token لا يعمل:**
   - تأكد من الـ Token صحيح
   - تحقق من أن الـ service name صحيح في الـ workflow
   - تأكد من ربط GitHub repo في Koyeb dashboard

---

## 📚 مصادر إضافية

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Koyeb Documentation](https://www.koyeb.com/docs)
- [Koyeb GitHub Integration](https://www.koyeb.com/docs/build-and-deploy/github)

---

**تم الإنشاء بواسطة:** Kiro AI  
**التاريخ:** 2026-04-20

# 🗑️ تنظيف GitHub Workflows

**تاريخ الإنشاء:** 2026-04-20  
**الغرض:** حذف الـ workflow runs القديمة والفاشلة

---

## 🎯 المشكلة

لديك 1,785 workflow runs قديمة في GitHub Actions، معظمها فاشلة بسبب:
- أخطاء ESLint القديمة
- أخطاء TypeScript القديمة
- مشاكل تم إصلاحها الآن

---

## ✅ الحل: سكريبت تنظيف تلقائي

### المتطلبات:

1. **GitHub CLI** - يجب تثبيته أولاً:
   ```powershell
   # عبر winget
   winget install --id GitHub.cli
   
   # أو قم بتحميله من
   # https://cli.github.com/
   ```

2. **المصادقة مع GitHub:**
   ```powershell
   gh auth login
   ```
   - اختر: GitHub.com
   - اختر: HTTPS
   - اتبع التعليمات

---

## 🚀 الاستخدام

### الطريقة 1: تشغيل السكريبت (الموصى به)

```powershell
# في PowerShell
.\scripts\cleanup-github-workflows.ps1
```

**ماذا يفعل السكريبت:**
1. ✅ يتحقق من تثبيت GitHub CLI
2. ✅ يتحقق من المصادقة
3. 🗑️ يحذف 100 workflow run فاشل
4. ❓ يسألك إذا تريد حذف المزيد
5. ❓ يسألك إذا تريد حذف الـ cancelled runs
6. 📊 يعرض ملخص نهائي

**مثال على الإخراج:**
```
🗑️ GitHub Workflows Cleanup Script
===================================

✅ GitHub CLI is installed
✅ Authenticated with GitHub

📦 Repository: Iaaelsadek/cinma

🚀 Starting cleanup...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  Cleaning up FAILED runs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Fetching failure workflow runs (limit: 100)...
📊 Found 100 failure runs

🗑️  Deleting run 12345... ✅
🗑️  Deleting run 12346... ✅
...

📊 Summary:
  ✅ Deleted: 100
  ❌ Failed: 0

⚠️  There might be more failed runs!

Do you want to delete another batch of 100? (y/n): y
```

---

### الطريقة 2: يدوياً عبر GitHub CLI

إذا أردت التحكم الكامل:

```powershell
# حذف 100 workflow run فاشل
gh run list --repo Iaaelsadek/cinma --workflow="deploy.yml" --status=failure --limit=100 --json databaseId --jq '.[].databaseId' | ForEach-Object { gh run delete $_ --repo Iaaelsadek/cinma }

# حذف الـ cancelled runs
gh run list --repo Iaaelsadek/cinma --workflow="deploy.yml" --status=cancelled --limit=100 --json databaseId --jq '.[].databaseId' | ForEach-Object { gh run delete $_ --repo Iaaelsadek/cinma }

# حذف الـ skipped runs
gh run list --repo Iaaelsadek/cinma --workflow="deploy.yml" --status=skipped --limit=100 --json databaseId --jq '.[].databaseId' | ForEach-Object { gh run delete $_ --repo Iaaelsadek/cinma }
```

---

### الطريقة 3: عبر GitHub UI (بطيئة)

إذا لم تستطع استخدام CLI:

1. اذهب إلى: https://github.com/Iaaelsadek/cinma/actions
2. اختر workflow: "CI/CD Pipeline - Production Deployment"
3. لكل run فاشل:
   - اضغط على الـ run
   - اضغط على "..." (ثلاث نقاط) في الأعلى
   - اختر "Delete workflow run"
4. كرر للـ 1,785 run 😅 (لهذا السكريبت أفضل!)

---

## 📊 التقدم المتوقع

### إذا كان لديك 1,785 runs:

**باستخدام السكريبت:**
- الدفعة 1: 100 runs (دقيقة واحدة)
- الدفعة 2: 100 runs (دقيقة واحدة)
- ...
- الدفعة 18: 85 runs (دقيقة واحدة)

**المجموع:** ~18-20 دقيقة لحذف الكل

**يدوياً عبر UI:**
- ~1,785 نقرة × 3 ثواني = ~90 دقيقة 😱

---

## ⚠️ ملاحظات مهمة

### 1. Rate Limiting
GitHub API لديه حدود:
- 5,000 requests/hour للمستخدمين المصادقين
- السكريبت يضيف delay صغير (100ms) بين كل حذف

### 2. لا يمكن التراجع
بمجرد حذف workflow run، لا يمكن استرجاعه!

### 3. الـ Successful Runs
السكريبت لا يحذف الـ successful runs تلقائياً.
إذا أردت حذفها:
```powershell
gh run list --repo Iaaelsadek/cinma --workflow="deploy.yml" --status=success --limit=100 --json databaseId --jq '.[].databaseId' | ForEach-Object { gh run delete $_ --repo Iaaelsadek/cinma }
```

---

## 🎯 بعد التنظيف

### تحقق من النتيجة:
```powershell
# عرض عدد الـ runs المتبقية
gh run list --repo Iaaelsadek/cinma --workflow="deploy.yml" --limit=1000 | Measure-Object
```

### أو عبر المتصفح:
https://github.com/Iaaelsadek/cinma/actions

---

## 🔮 منع المشكلة مستقبلاً

### 1. إصلاح الأخطاء (تم ✅)
- ESLint errors - تم إصلاحها
- TypeScript errors - تم إصلاحها
- Tests - تم تحديثها

### 2. Auto-cleanup (اختياري)
يمكنك إضافة workflow لحذف الـ runs القديمة تلقائياً:

```yaml
# .github/workflows/cleanup-old-runs.yml
name: Cleanup Old Workflow Runs

on:
  schedule:
    - cron: '0 0 * * 0'  # كل أسبوع
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Delete old workflow runs
        uses: Mattraks/delete-workflow-runs@v2
        with:
          token: ${{ github.token }}
          repository: ${{ github.repository }}
          retain_days: 30
          keep_minimum_runs: 10
```

---

## 🆘 المساعدة

### إذا واجهت مشاكل:

**خطأ: "gh: command not found"**
```powershell
# تثبيت GitHub CLI
winget install --id GitHub.cli

# أو قم بتحميله من
# https://cli.github.com/
```

**خطأ: "authentication required"**
```powershell
# المصادقة مع GitHub
gh auth login
```

**خطأ: "rate limit exceeded"**
```powershell
# انتظر ساعة واحدة، ثم حاول مرة أخرى
# أو قلل عدد الـ runs في كل دفعة
```

---

## 📝 الخلاصة

1. ✅ ثبت GitHub CLI
2. ✅ صادق مع GitHub
3. ✅ شغل السكريبت: `.\scripts\cleanup-github-workflows.ps1`
4. ✅ اتبع التعليمات
5. ✅ استمتع بـ Actions page نظيف! 🎉

---

**تم الإنشاء بواسطة:** Kiro AI  
**التاريخ:** 2026-04-20


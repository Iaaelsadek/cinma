# 🔧 Git Workflow Rules

**آخر تحديث:** 2026-04-20  
**الأولوية:** CRITICAL

---

## 🚨 القاعدة الأساسية

```
NEVER run `git push` automatically!
ALWAYS tell the user to push manually.
```

---

## ✅ الروتين الصحيح

### ما يجب فعله:
1. ✅ عمل التعديلات على الملفات
2. ✅ `git add -A` لإضافة التغييرات
3. ✅ `git commit -m "message"` لحفظ التغييرات
4. ✅ إخبار المستخدم أن الـ commit جاهز

### ما يجب تجنبه:
- ❌ **NEVER** run `git push`
- ❌ **NEVER** run `git push origin main`
- ❌ **NEVER** run `git push origin master`
- ❌ **NEVER** run any push command automatically

---

## 📝 الرسالة للمستخدم

بعد كل commit، قل للمستخدم:

```
✅ تم عمل commit بنجاح!

الرجاء تشغيل الأمر التالي يدوياً في PowerShell:
git push origin main
```

---

## 🔍 السبب

- البيئة الحالية (sandbox/IDE) قد تسبب مشاكل مع `git push`
- الـ push اليدوي أكثر أماناً وموثوقية
- يعطي المستخدم السيطرة الكاملة على عملية الرفع

---

## 🎯 الخلاصة

**Kiro Workflow:**
1. Make changes ✅
2. `git add -A` ✅
3. `git commit -m "..."` ✅
4. Tell user to push manually ✅

**User Workflow:**
1. Review commit
2. `git push origin main` manually in PowerShell

---

**هذه القاعدة إلزامية ولا يجوز مخالفتها!**

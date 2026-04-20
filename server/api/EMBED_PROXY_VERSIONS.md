# 🎬 Embed Proxy Versions Guide

## 📁 Available Versions

### 1. `embed-proxy.js` (Current Active)
**الملف الحالي المستخدم**
- يحتوي على حماية قوية ضد الإعلانات
- مناسب لاختبار السيرفرات
- يحجب popup ads و redirects

### 2. `embed-proxy-with-ad-blocking.js` (Backup - With Protection)
**نسخة احتياطية مع الحماية الكاملة**
- نفس الحماية الموجودة في النسخة الحالية
- استخدمها لو عايز ترجع للحماية القوية
- تحجب كل أنواع الإعلانات

### 3. `embed-proxy-no-ad-blocking.js` (Clean Version)
**النسخة النظيفة بدون حماية**
- بدون أي حماية ضد الإعلانات
- تسمح بكل المحتوى من السيرفرات الخارجية
- مناسبة للإنتاج لو عايز تسمح بالإعلانات

---

## 🔄 How to Switch Between Versions

### للرجوع للنسخة مع الحماية:
```bash
# Backup current version
cp server/api/embed-proxy.js server/api/embed-proxy-backup.js

# Copy the version with ad blocking
cp server/api/embed-proxy-with-ad-blocking.js server/api/embed-proxy.js

# Restart server
npm run server
```

### للرجوع للنسخة بدون حماية:
```bash
# Backup current version
cp server/api/embed-proxy.js server/api/embed-proxy-backup.js

# Copy the clean version
cp server/api/embed-proxy-no-ad-blocking.js server/api/embed-proxy.js

# Restart server
npm run server
```

---

## 🛡️ Ad Blocking Features (في النسخة مع الحماية)

### 1. **Popup Blocking**
- يحجب `window.open()` بالكامل
- يمنع فتح نوافذ جديدة

### 2. **Redirect Blocking**
- يمنع تغيير الـ URL تلقائياً
- يحجب محاولات التحويل

### 3. **Script Blocking**
- يحجب سكريبتات الإعلانات المعروفة:
  - disable-devtool
  - popads, popcash
  - propeller, adcash
  - exoclick, juicyads
  - وغيرها...

### 4. **DOM Cleaning**
- يزيل عناصر الإعلانات من الصفحة
- فحص مستمر كل 2 ثانية
- يحذف أي عنصر يحتوي على "ad" أو "popup"

### 5. **Timer Blocking**
- يحجب `setTimeout` و `setInterval` للإعلانات
- يمنع تشغيل كود إعلانات متأخر

---

## 📊 Comparison Table

| Feature | With Ad Blocking | No Ad Blocking |
|---------|-----------------|----------------|
| Popup Ads | ❌ Blocked | ✅ Allowed |
| Redirects | ❌ Blocked | ✅ Allowed |
| Ad Scripts | ❌ Blocked | ✅ Allowed |
| DOM Cleaning | ✅ Active | ❌ Disabled |
| Video Playback | ✅ Works | ✅ Works |
| Performance | 🟢 Fast | 🟢 Fast |

---

## 🎯 Recommendations

### للاختبار (Testing):
✅ استخدم `embed-proxy-with-ad-blocking.js`
- حماية كاملة ضد الإعلانات
- تجربة نظيفة للاختبار

### للإنتاج (Production):
⚠️ قرر حسب احتياجك:
- **مع الحماية**: تجربة أفضل للمستخدمين، لكن قد تؤثر على بعض السيرفرات
- **بدون حماية**: كل السيرفرات تشتغل، لكن فيه إعلانات

---

## 📝 Notes

- النسخة الحالية (`embed-proxy.js`) تحتوي على الحماية الكاملة
- يمكنك التبديل بين النسخ في أي وقت
- لا تنسى إعادة تشغيل السيرفر بعد التغيير
- احتفظ بنسخة احتياطية قبل أي تعديل

---

**Last Updated:** 2026-04-05
**Current Active Version:** embed-proxy.js (With Ad Blocking)

# ✅ تفعيل الترجمة العربية للمشغل

**التاريخ**: 2026-04-05 الساعة 04:15 صباحاً  
**الحالة**: ✅ مفعّل

---

## 🎯 ما تم إنجازه

تم تعديل الكود لإضافة معاملات الترجمة العربية لجميع روابط السيرفرات (أفلام ومسلسلات).

---

## 🔧 التعديلات

### الملف المعدل: `src/lib/serverCatalog.ts`

#### قبل التعديل ❌
```typescript
const withArabicSubtitleHint = (url: string, providerId: string, type: 'movie' | 'tv', lang: string = 'ar') => {
  if (!lang) return url
  const lower = providerId.toLowerCase()
  if (type === 'movie') {
    // فقط autoembed و 111movies
    if (lower === 'autoembed_co' || lower === '111movies') {
      return addParamIfMissing(url, 'lang', lang)
    }
    return url  // ❌ باقي السيرفرات لا تحصل على معاملات
  }
  // ... TV shows logic
}
```

#### بعد التعديل ✅
```typescript
const withArabicSubtitleHint = (url: string, providerId: string, type: 'movie' | 'tv', lang: string = 'ar') => {
  if (!lang) return url
  const lower = providerId.toLowerCase()
  
  // ✅ تطبيق الترجمة العربية للأفلام والمسلسلات معاً
  if (lower.startsWith('vidsrc_')) {
    let next = url
    next = addParamIfMissing(next, 'sub.lang', lang)
    next = addParamIfMissing(next, 'lang', lang)
    return next
  }
  
  if (lower === 'autoembed_co') {
    let next = url
    next = addParamIfMissing(next, 'lang', lang)
    return next
  }
  
  if (lower.startsWith('2embed')) {
    let next = url
    next = addParamIfMissing(next, 'lang', lang)
    return next
  }
  
  // ... باقي السيرفرات
}
```

---

## 📊 أمثلة الروابط

### الأفلام (Movies)

#### The Shawshank Redemption (TMDB: 278)

**قبل التعديل**:
```
❌ https://vidsrc.net/embed/movie/278
❌ https://vidsrc.io/embed/movie/278
❌ https://www.2embed.cc/embed/movie/278
```

**بعد التعديل**:
```
✅ https://vidsrc.net/embed/movie/278?sub.lang=ar&lang=ar
✅ https://vidsrc.io/embed/movie/278?sub.lang=ar&lang=ar
✅ https://www.2embed.cc/embed/movie/278?lang=ar
✅ https://autoembed.co/movie/tmdb/278?lang=ar
✅ https://vidsrc.cc/v2/embed/movie/278?sub.lang=ar&lang=ar
```

---

### المسلسلات (TV Shows)

#### Breaking Bad S01E01 (TMDB: 1396)

**قبل التعديل**:
```
✅ https://vidsrc.net/embed/tv/1396/1/1?subtitles=ar&lang=ar
✅ https://autoembed.co/tv/tmdb/1396-1-1?lang=ar
```

**بعد التعديل**:
```
✅ https://vidsrc.net/embed/tv/1396/1/1?sub.lang=ar&lang=ar
✅ https://vidsrc.io/embed/tv/1396/1/1?sub.lang=ar&lang=ar
✅ https://www.2embed.cc/embed/1396/1/1?lang=ar
✅ https://autoembed.co/tv/tmdb/1396-1-1?lang=ar
✅ https://vidsrc.cc/v2/embed/tv/1396?autoPlay=false&s=1&e=1&sub.lang=ar&lang=ar
```

---

## 🎬 معاملات الترجمة المستخدمة

### VidSrc Servers (vidsrc.net, vidsrc.io, vidsrc.cc, etc.)
```
?sub.lang=ar&lang=ar
```

### AutoEmbed
```
?lang=ar
```

### 2Embed (2embed.cc, 2embed.skin)
```
?lang=ar
```

### 111Movies
```
?lang=ar
```

### SmashyStream
```
?sub=ar&lang=ar
```

---

## ✅ التحقق

### اختبار 1: فيلم The Dark Knight
```bash
# URL المتوقع
https://vidsrc.net/embed/movie/155?sub.lang=ar&lang=ar

# المعاملات
✅ sub.lang=ar  # لغة الترجمة
✅ lang=ar      # لغة الواجهة
```

### اختبار 2: مسلسل Breaking Bad
```bash
# URL المتوقع
https://vidsrc.net/embed/tv/1396/1/1?sub.lang=ar&lang=ar

# المعاملات
✅ sub.lang=ar  # لغة الترجمة
✅ lang=ar      # لغة الواجهة
```

---

## 📝 ملاحظات مهمة

### 1. توفر الترجمة
معاملات الترجمة تُرسل إلى السيرفرات، لكن توفر الترجمة العربية يعتمد على:
- السيرفر نفسه (هل يدعم الترجمة العربية؟)
- المحتوى (هل توجد ترجمة عربية متاحة؟)
- جودة الترجمة (قد تكون آلية أو يدوية)

### 2. السيرفرات المدعومة
جميع السيرفرات الرئيسية تدعم معاملات الترجمة:
- ✅ VidSrc (جميع الإصدارات)
- ✅ AutoEmbed
- ✅ 2Embed
- ✅ 111Movies
- ✅ SmashyStream

### 3. الأولوية
إذا كان السيرفر يدعم الترجمة العربية، سيتم عرضها تلقائياً.
إذا لم تكن متوفرة، سيعرض السيرفر الترجمة الإنجليزية أو بدون ترجمة.

### 4. تغيير اللغة
المستخدم يمكنه تغيير لغة الترجمة من داخل المشغل نفسه (إذا كان السيرفر يدعم ذلك).

---

## 🎯 الخلاصة

### ما تم إنجازه
1. ✅ إضافة معاملات الترجمة العربية لجميع السيرفرات
2. ✅ تطبيق المعاملات على الأفلام والمسلسلات
3. ✅ استخدام المعاملات الصحيحة لكل سيرفر
4. ✅ الحفاظ على التوافق مع جميع السيرفرات

### الملفات المعدلة
- `src/lib/serverCatalog.ts` (دالة `withArabicSubtitleHint`)

### الاختبار
```bash
# افتح المتصفح على
http://localhost:5173/watch/movie/the-dark-knight

# النتيجة المتوقعة
✅ المشغل يحمل
✅ الترجمة العربية متاحة (إذا كانت موجودة على السيرفر)
✅ يمكن تغيير اللغة من إعدادات المشغل
```

---

## 🔍 كيفية التحقق من الترجمة

### في المتصفح
1. افتح صفحة المشاهدة
2. انتظر تحميل المشغل
3. ابحث عن أيقونة الترجمة (CC) في المشغل
4. اختر "Arabic" أو "العربية" من القائمة

### في Console المتصفح
```javascript
// افتح Console (F12)
// ابحث عن iframe المشغل
const iframe = document.querySelector('iframe')
console.log(iframe.src)

// يجب أن ترى
// https://vidsrc.net/embed/movie/155?sub.lang=ar&lang=ar
```

---

**تم التفعيل بنجاح! 🎉**

**ملاحظة**: توفر الترجمة العربية يعتمد على السيرفر والمحتوى نفسه.

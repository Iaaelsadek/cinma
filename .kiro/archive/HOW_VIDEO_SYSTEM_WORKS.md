# 📖 كيف يعمل نظام الفيديوهات - شرح تفصيلي

**التاريخ**: 2026-04-06

---

## 🎯 السؤال: ليه الفيديو بينزل باسم تاني؟

### الإجابة المختصرة:
**الكود صحيح 100%** - المشكلة في البيانات المضافة (معرف الفيديو خاطئ).

---

## 🔍 كيف يعمل النظام (خطوة بخطوة)

### 1️⃣ تخزين البيانات في قاعدة البيانات

```sql
INSERT INTO videos (id, title, thumbnail) VALUES (
  'zSWdZVtXT7E',                                    -- معرف YouTube
  'Interstellar - Official Trailer',                -- العنوان
  'https://i.ytimg.com/vi/zSWdZVtXT7E/hqdefault.jpg' -- الصورة
);
```

**ملاحظة مهمة**: 
- `id` = معرف الفيديو على YouTube
- `title` = العنوان الذي **أنت** تكتبه (ليس من YouTube)
- `thumbnail` = رابط الصورة الذي **أنت** تكتبه

---

### 2️⃣ عرض القائمة في `/summaries`

**الكود** (`src/pages/discovery/Summaries.tsx`):
```typescript
// 1. جلب البيانات من API
const { data: dbSummaries } = useCategoryVideos('summary')

// 2. عرض كل فيديو
{displayItems.map((item) => (
  <VideoCard key={item.id} video={item} />
))}
```

**VideoCard** (`src/components/features/media/VideoCard.tsx`):
```typescript
// عرض العنوان من قاعدة البيانات
<h3>{video.title}</h3>

// عرض الصورة من قاعدة البيانات
<img src={video.thumbnail} alt={video.title} />

// عند الضغط، الانتقال إلى صفحة المشاهدة
onClick={() => navigate(`/watch/video/${video.id}`)}
```

**النتيجة**:
- العنوان المعروض = `video.title` من قاعدة البيانات ✅
- الصورة المعروضة = `video.thumbnail` من قاعدة البيانات ✅
- الرابط = `/watch/video/zSWdZVtXT7E` ✅

---

### 3️⃣ صفحة المشاهدة `/watch/video/:id`

**الكود** (`src/pages/media/Watch.tsx`):
```typescript
// 1. جلب معرف الفيديو من الرابط
const { id } = useParams() // id = "zSWdZVtXT7E"

// 2. جلب بيانات الفيديو من API
const response = await fetch(`http://localhost:3001/api/videos/${id}`)
const videoData = await response.json()

// 3. عرض العنوان من قاعدة البيانات
<h1>{videoData.title}</h1>

// 4. تشغيل الفيديو من YouTube
<iframe
  src={`https://www.youtube.com/embed/${videoData.id}?autoplay=1`}
/>
```

**النتيجة**:
- العنوان المعروض = `videoData.title` من قاعدة البيانات ✅
- الفيديو المشغل = `https://www.youtube.com/embed/zSWdZVtXT7E` ✅

---

## ⚠️ أين تحدث المشكلة؟

### السيناريو الخاطئ:

```sql
-- أنت تضيف في قاعدة البيانات:
INSERT INTO videos (id, title) VALUES (
  'ABC123',                    -- معرف خاطئ
  'ملخص فيلم Inception'        -- عنوان صحيح
);
```

**ماذا يحدث؟**

1. **في `/summaries`**:
   - العنوان المعروض: "ملخص فيلم Inception" ✅ (من قاعدة البيانات)
   - الصورة: من `ABC123` ❌ (قد تكون خاطئة)

2. **عند الضغط على "مشاهدة الآن"**:
   - الكود ينتقل إلى: `/watch/video/ABC123` ✅
   - العنوان المعروض: "ملخص فيلم Inception" ✅ (من قاعدة البيانات)
   - الفيديو المشغل: `https://www.youtube.com/embed/ABC123` ❌

3. **المشكلة**:
   - الفيديو `ABC123` على YouTube **ليس** عن Inception
   - هو فيديو عن شيء آخر تماماً!

---

## ✅ الحل الصحيح

### يجب أن يكون:

```sql
-- 1. افتح YouTube وابحث عن "Inception trailer"
-- 2. افتح الفيديو: https://www.youtube.com/watch?v=YoHD9XEInc0
-- 3. تأكد أن الفيديو فعلاً عن Inception
-- 4. انسخ المعرف من الرابط: YoHD9XEInc0
-- 5. أضف في قاعدة البيانات:

INSERT INTO videos (id, title, thumbnail) VALUES (
  'YoHD9XEInc0',                                    -- المعرف الصحيح
  'Inception - Official Trailer',                   -- العنوان الصحيح
  'https://i.ytimg.com/vi/YoHD9XEInc0/hqdefault.jpg' -- الصورة الصحيحة
);
```

**الآن**:
- العنوان = "Inception - Official Trailer" ✅
- الفيديو = Inception trailer ✅
- الصورة = من Inception trailer ✅

---

## 🎯 الخلاصة

### الكود صحيح 100%:

```
قاعدة البيانات → API → Frontend → YouTube Player
     ↓              ↓        ↓            ↓
   (id, title) → (id, title) → (title) → (id)
```

**الكود يعمل بالضبط كما هو مطلوب**:
1. يعرض العنوان من قاعدة البيانات ✅
2. يعرض الصورة من قاعدة البيانات ✅
3. يشغل الفيديو باستخدام `id` من قاعدة البيانات ✅

### المشكلة في البيانات:

إذا كان `id` في قاعدة البيانات **لا يطابق** `title`:
- العنوان سيكون صحيح (من قاعدة البيانات)
- الفيديو سيكون خاطئ (لأن `id` خاطئ)

---

## 🧪 اختبار الآن

أضفت فيديو واحد للاختبار:

```
ID: zSWdZVtXT7E
Title: Interstellar - Official Trailer
URL: https://www.youtube.com/watch?v=zSWdZVtXT7E
```

**اختبر الآن**:
1. افتح: http://localhost:5173/summaries
2. هل العنوان "Interstellar - Official Trailer"? ✅
3. اضغط على الفيديو
4. هل الفيديو المشغل هو Interstellar trailer? ✅

**إذا كانت الإجابة نعم** = الكود يعمل بشكل صحيح! 🎉

---

## 💡 للمستقبل

عند إنشاء سكريبت لسحب المحتوى:

```javascript
// استخدم YouTube Data API
const response = await fetch(
  `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${API_KEY}&part=snippet`
)
const data = await response.json()

// الآن لديك:
const correctTitle = data.items[0].snippet.title        // العنوان الصحيح
const correctThumbnail = data.items[0].snippet.thumbnails.high.url  // الصورة الصحيحة

// أضف في قاعدة البيانات
INSERT INTO videos (id, title, thumbnail) VALUES (
  videoId,           // المعرف
  correctTitle,      // العنوان من YouTube
  correctThumbnail   // الصورة من YouTube
);
```

**بهذه الطريقة**:
- المعرف = من YouTube ✅
- العنوان = من YouTube ✅
- الصورة = من YouTube ✅
- **كل شيء متطابق!** 🎉

---

**آخر تحديث**: 2026-04-06 03:50 UTC

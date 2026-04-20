# وثيقة متطلبات إصلاح الخلل - Arabic Movies Duplicate and Missing Slugs Fix

## المقدمة

تظهر مشكلتان حرجتان في الصفحة الرئيسية لموقع Cinema.online تؤديان إلى تعطل الموقع بالكامل:

**المشكلة الأولى: Missing slug error**
- أفلام متعددة تظهر خطأ "Missing slug for content movie:1290821 (مأوى)" و "Missing slug for content movie:53220 (Rabbit Fire)"
- الصفحة تتعطل بالكامل وتظهر رسالة "عذراً، حدث خطأ ما"
- الخطأ يحدث عند محاولة عرض محتوى بدون slug صالح

**المشكلة الثانية: 20 فيلم عربي متكررين**
- نفس 20 فيلم عربي يظهرون في جميع الأقسام (trending, arabic series, kids, bollywood, korean, turkish, chinese, documentaries, anime, classics)
- عند فتح أي فيلم منهم، الصفحة تظهر:
  - العنوان: "loading"
  - لا يوجد وصف
  - الروابط تعمل بشكل صحيح (مثال: http://localhost:5173/watch/movie/khth-jymy)

**السبب الجذري:**
بعد التحليل، المشكلة تكمن في endpoint `/api/db/home` في `server/api/db.js`:
1. الاستعلامات لا تفلتر الأفلام التي لها slug = NULL أو slug غير صالح
2. الاستعلام `kids` يجلب جميع الأفلام بدلاً من أفلام الأطفال فقط (لا يوجد فلترة حسب النوع)
3. جميع الاستعلامات تستخدم `ORDER BY popularity DESC` مما يؤدي لإرجاع نفس الأفلام الشائعة في كل قسم
4. لا يوجد فلترة حسب النوع/الفئة لكل قسم (kids, documentaries, anime, classics)

## تحليل الخلل

### السلوك الحالي (العيب)

1.1 عندما يجلب `/api/db/home` endpoint البيانات من جدول `movies` فإن النظام يرجع أفلام بدون slug (slug = NULL) مما يسبب خطأ "Missing slug for content movie:X"

1.2 عندما يجلب `/api/db/home` endpoint البيانات من جدول `tv_series` للمسلسلات العربية فإن النظام يرجع مسلسلات بدون slug (slug = NULL) مما يسبب خطأ "Missing slug for content"

1.3 عندما يجلب `/api/db/home` endpoint قسم `kids` فإن النظام يجلب جميع الأفلام (ORDER BY popularity DESC LIMIT 50) بدلاً من أفلام الأطفال فقط، مما يؤدي لإرجاع نفس 20 فيلم شائع

1.4 عندما يجلب `/api/db/home` endpoint قسم `bollywood` فإن النظام يفلتر حسب `original_language = 'hi'` فقط بدون التحقق من وجود slug صالح

1.5 عندما يجلب `/api/db/home` endpoint قسم `trending` فإن النظام يرجع أفلام بدون التحقق من وجود slug صالح (slug IS NOT NULL)

1.6 عندما تعرض الصفحة الرئيسية محتوى بدون slug فإن دالة `generateWatchUrl()` تفشل وتطرح خطأ مما يؤدي لتعطل الصفحة بالكامل

1.7 عندما يفتح المستخدم فيلم من الأفلام المتكررة (مثل /watch/movie/khth-jymy) فإن الصفحة تعرض "loading" كعنوان لأن البيانات غير مكتملة أو الـ slug لا يطابق أي محتوى في قاعدة البيانات

### السلوك المتوقع (الصحيح)

2.1 عندما يجلب `/api/db/home` endpoint البيانات من جدول `movies` فإن النظام يجب أن يفلتر الأفلام ويرجع فقط الأفلام التي لها slug صالح (slug IS NOT NULL AND slug != '' AND slug != 'content')

2.2 عندما يجلب `/api/db/home` endpoint البيانات من جدول `tv_series` للمسلسلات العربية فإن النظام يجب أن يفلتر المسلسلات ويرجع فقط المسلسلات التي لها slug صالح

2.3 عندما يجلب `/api/db/home` endpoint قسم `kids` فإن النظام يجب أن يفلتر حسب نوع المحتوى (genres تحتوي على Family/Animation/Kids) ويرجع فقط أفلام الأطفال مع slugs صالحة

2.4 عندما يجلب `/api/db/home` endpoint قسم `bollywood` فإن النظام يجب أن يفلتر حسب `original_language = 'hi'` AND `slug IS NOT NULL` لضمان وجود slugs صالحة

2.5 عندما يجلب `/api/db/home` endpoint قسم `trending` فإن النظام يجب أن يفلتر ويرجع فقط الأفلام التي لها slug صالح

2.6 عندما تعرض الصفحة الرئيسية محتوى مع slugs صالحة فإن دالة `generateWatchUrl()` يجب أن تنشئ روابط صحيحة بدون أخطاء

2.7 عندما يفتح المستخدم فيلم من الأفلام فإن الصفحة يجب أن تعرض العنوان والوصف الصحيحين من قاعدة البيانات بدلاً من "loading"

### السلوك غير المتغير (منع الانحدار)

3.1 عندما يجلب `/api/db/home` endpoint أفلام لها slugs صالحة فإن النظام يجب أن يستمر في إرجاع هذه الأفلام بنفس البيانات الكاملة (id, slug, title, poster_path, backdrop_path, vote_average, overview, release_date, popularity, media_type)

3.2 عندما يجلب `/api/db/home` endpoint مسلسلات عربية لها slugs صالحة فإن النظام يجب أن يستمر في إرجاع هذه المسلسلات بنفس البيانات الكاملة

3.3 عندما تعرض الصفحة الرئيسية محتوى من `/api/db/home` فإن النظام يجب أن يستمر في عرض الأقسام بنفس الترتيب والتنسيق

3.4 عندما يستخدم `/api/db/home` endpoint الـ cache (300 ثانية) فإن النظام يجب أن يستمر في إرجاع البيانات المخزنة مؤقتاً لتحسين الأداء

3.5 عندما يجلب endpoints أخرى مثل `/api/db/tv/korean`, `/api/db/tv/turkish`, `/api/db/tv/chinese` البيانات فإن النظام يجب أن يستمر في إرجاع محتوى مع slugs صالحة (تحتوي بالفعل على `slug IS NOT NULL`)

3.6 عندما يجلب endpoints مثل `/api/db/movies/documentaries`, `/api/db/tv/anime`, `/api/db/movies/classics` البيانات فإن النظام يجب أن يستمر في إرجاع محتوى مفلتر حسب النوع مع slugs صالحة

3.7 عندما يستخدم المستخدمون الموقع ويتصفحون الأقسام المختلفة فإن النظام يجب أن يستمر في عرض محتوى متنوع وليس نفس الأفلام في كل قسم

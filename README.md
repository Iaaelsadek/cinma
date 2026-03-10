# cinma.online

منصة مشاهدة عربية حديثة تعتمد على TMDB وSupabase، مع دعم PWA والتوصيات الذكية والتعليقات والإعلانات.

> **ملاحظة:** تم إجراء مراجعة شاملة للمشروع (فبراير 2026). يمكن الاطلاع على التفاصيل في [PROJECT_REVIEW.md](./PROJECT_REVIEW.md).

## 📁 هيكلة المشروع
- `src/components/features`: المكونات الوظيفية (مشغل الفيديو، القطار السينمائي، النظام).
- `src/components/common`: مكونات واجهة المستخدم العامة.
- `src/pages`: صفحات التطبيق (الرئيسية، المشاهدة، الاكتشاف).
- `src/lib`: دوال مساعدة والربط مع Supabase/TMDB.

## 🛠️ أدوات التطوير
نفّذ الأوامر التالية أثناء العمل على الكود:

```bash
# تحقق من الأنماط والخطوط
npm run lint         # فقط فحص
npm run lint:fix     # تصحيح تلقائي
npm run format       # تطبيق Prettier
npm run stylelint    # فحص CSS/SCSS
npm test             # تشغيل اختبارات الوحدة
npm run test:coverage # إنشاء تقرير تغطية (افتراضيًا >50% globallly)
npm run typecheck    # تحقق TypeScript
```

عند حفظ، تؤدي حزمة Husky إلى تشغيل هذه الأدوات على الملفات المعدّلة تلقائيًا.


## 🐍 تشغيل سكريبت المزامنة التلقائية (Python)

يساعد هذا السكريبت على جلب الأفلام والمسلسلات الشائعة من TMDB وتحديث قاعدة البيانات في Supabase. النسخة الحالية تولّد ملخصات عربية مختصرة عبر Gemini (اختياري).
 لاحقًا يمكن إضافة خطوة مراجعات YouTube (تتطلب مفتاح YouTube).

### المتطلبات
- Python 3.8 أو أحدث
- pip (مدير حزم Python)

### تهيئة مفاتيح البيئة
قبل التشغيل، عرّف المفاتيح في البيئة:

- `TMDB_API_KEY` (مطلوب)
- `SUPABASE_URL` (مطلوب)
- `SUPABASE_SERVICE_ROLE` (مطلوب – احفظه بأمان ولا تُنشره علنًا)
- `GEMINI_API_KEY` (اختياري للملخصات الذكية)

Windows PowerShell (جلسة مؤقتة):
```powershell
$env:TMDB_API_KEY="YOUR_TMDB_KEY"
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE="YOUR_SERVICE_ROLE_KEY"
$env:GEMINI_API_KEY="YOUR_GEMINI_KEY"
```

### خطوات التشغيل
1. انتقل إلى مجلد `scripts`:
   ```bash
   cd scripts
   ```
2. ثبّت الحزم المطلوبة:
   ```bash
   pip install -r requirements.txt
   ```
3. شغّل السكريبت:
   ```bash
   python fill_content.py
   ```
4. انتظر حتى يكتمل (قد يستغرق بضع دقائق حسب عدد الصفحات).

### ملاحظات
- احرص على صحة مفاتيح البيئة (Supabase, TMDB، وGEMINI إن أردت الملخصات).
- السكريبت يحدّث جدولي `movies` و`tv_series`.
- لتشغيله دوريًا: استخدم أدوات جدولة (cron، GitHub Actions، أو منصات مماثلة).
- أخطاء الوصول في الواجهات الخارجية شائعة بدون مفاتيح صحيحة (على سبيل المثال، طلبات TMDB بدون مفتاح تعطي "Invalid API key"، وYouTube Search يرفض الطلبات دون هوية).

---

## 📱 إعداد PWA (قابل للتثبيت على الأجهزة)

- تم تضمين `vite-plugin-pwa` وتكويناته في `vite.config.ts` (تسجيل تلقائي وتحديث تلقائي للـ Service Worker).
- أيقونات PWA:
  - أنشئ المجلد `public/icons` وضع بداخله ملفات:
    - `icon-192x192.png`
    - `icon-512x512.png`
    - `apple-touch-icon.png` (اختياري)
  - يمكنك توليد الأيقونات من شعار/نص عبر مولدات مجانية مثل favicon.io.

### اختبار محلي
1. بناء المشروع ثم المعاينة:
   ```bash
   npm run build
   npm run preview
   ```
2. افتح المتصفح → أدوات المطور (F12) → Application → Manifest للتأكد من البيانات.
3. تحقق من تسجيل الـ Service Worker في تبويب Service Workers.
4. (اختياري) أضف بطاقة تشجّع المستخدم على التثبيت في الواجهة الأمامية لاحقًا.

---

## ☁️ النشر على Cloudflare Pages (مؤقت)

- أمر البناء: `npm run build`
- مجلد النشر: `dist`
- تأكد من تعريف مفاتيح البيئة (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TMDB_API_KEY`, إلخ) في إعدادات Cloudflare Pages.
- يضيف `vite-plugin-sitemap` خريطة موقع تلقائيًا (راجع `vite.config.ts`).

---

## 🔍 تحسين SEO عبر react-helmet-async

- تم لف التطبيق ضمن `<HelmetProvider>`، وإضافة `<Helmet>` لصفحات رئيسية مثل: الصفحة الرئيسية، تفاصيل الفيلم/المسلسل، البحث، والملف الشخصي.
- أضف صورة `public/og-image.jpg` (مقاس 1200×630) لوسوم Open Graph.

---

## 🔒 الحساسيات والتجاهل

- الملف `.gitignore` يتجاهل `.env` و`__pycache__` و`.venv` وغيرها.
- لا تحفظ مفاتيح حساسة داخل المستودع. استخدم متغيرات البيئة أو أنظمة أسرار CI/CD.

---

## 🧩 ملاحظات فنية مختصرة

- المشغل يدعم:
  - تخطي المقدمة عبر حقلي `intro_start` و`intro_end` في جدول `episodes`.
  - ترجمة عبر ملفات VTT أو تحويل SRT إلى VTT داخل المتصفح.
  - روابط تحميل عبر `download_urls` في جداول `movies` و`episodes`.
- لوحة الإدارة:
  - تحرير روابط تحميل الأفلام داخل لوحة التحكم.
  - إدارة حلقات الموسم مع حقول المقدمة/الترجمة/التحميل لكل حلقة.
- الأيقونات والـ OG image مطلوبة لإكمال تجربة PWA ووسوم المشاركة.
# cinma

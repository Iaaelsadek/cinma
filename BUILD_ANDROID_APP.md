# 📱 دليل بناء تطبيق Android

## المشكلة الحالية
ملف APK غير موجود في `public/downloads/` - لازم تبني التطبيق الأول

---

## 🔧 خطوات بناء التطبيق

### 1. تثبيت المتطلبات

```bash
# انتقل لمجلد التطبيق
cd android_app

# ثبت التبعيات
npm install
```

### 2. إعداد ملف البيئة

```bash
# انسخ ملف البيئة
cp .env.example .env

# عدّل .env وأضف:
EXPO_PUBLIC_API_URL=https://cinma.online
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. بناء APK

#### الطريقة 1: باستخدام EAS Build (موصى بها)

```bash
# ثبت EAS CLI
npm install -g eas-cli

# سجل دخول
eas login

# أنشئ build profile
eas build:configure

# ابني APK
eas build --platform android --profile preview
```

#### الطريقة 2: Build محلي (يحتاج Android Studio)

```bash
# ابني محلياً
npx expo prebuild
cd android
./gradlew assembleRelease

# الملف سيكون في:
# android/app/build/outputs/apk/release/app-release.apk
```

### 4. نقل APK للمشروع

```bash
# ارجع للمجلد الرئيسي
cd ..

# انسخ APK
cp android_app/android/app/build/outputs/apk/release/app-release.apk public/downloads/online-cinema-v1.0.0.apk
```

### 5. تحديث متغير البيئة

في `.env.local`:
```env
VITE_APK_DOWNLOAD_URL=https://cinma.online/downloads/online-cinema-v1.0.0.apk
```

---

## 🚀 حل سريع (للتطوير فقط)

إذا كنت تريد اختبار الزر فقط بدون APK حقيقي:

```bash
# أنشئ ملف وهمي
echo "Placeholder APK" > public/downloads/online-cinema.apk
```

⚠️ **تحذير:** هذا للاختبار فقط! لازم تبني APK حقيقي قبل النشر.

---

## 📊 حجم APK المتوقع

- **React Native App:** 25-40 MB
- **مع الصور والأصول:** 30-50 MB
- **بعد التحسين:** 20-35 MB

---

## ✅ التحقق من APK

```bash
# تحقق من حجم الملف
ls -lh public/downloads/online-cinema-v1.0.0.apk

# يجب أن يكون بين 20-50 MB
```

---

## 🔐 توقيع APK (للإنتاج)

```bash
# أنشئ keystore
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# وقّع APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore app-release-unsigned.apk my-key-alias

# حسّن APK
zipalign -v 4 app-release-unsigned.apk online-cinema-v1.0.0.apk
```

---

## 📝 ملاحظات

1. **لا تنسى:** احفظ keystore في مكان آمن
2. **الحجم:** APK حجمه الطبيعي 25-40 MB
3. **الاختبار:** جرب التطبيق على أجهزة مختلفة قبل النشر
4. **التحديثات:** غيّر رقم الإصدار في `app.json` مع كل تحديث

---

## 🆘 مشاكل شائعة

### المشكلة: Build فشل
**الحل:** تأكد من تثبيت Android SDK و Java 11+

### المشكلة: APK كبير جداً
**الحل:** استخدم App Bundle أو فعّل ProGuard

### المشكلة: التطبيق لا يعمل
**الحل:** تحقق من ملف `.env` والـ permissions في `AndroidManifest.xml`

---

**آخر تحديث:** 19 مارس 2026

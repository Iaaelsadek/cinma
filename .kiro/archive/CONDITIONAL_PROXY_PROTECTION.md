# Conditional Proxy Protection - Complete Implementation ✅

## التاريخ: 2026-04-05

## الهدف:
تطبيق الحماية (sandbox/CSP/proxy + ad blocking) على **VidSrc.cc فقط**، وباقي السيرفرات تشتغل مباشر بدون proxy = أسرع.

---

## التغييرات المنفذة:

### 1. Backend: Conditional Ad Blocking في `embed-proxy.js` ✅

```javascript
// 🛡️ CONDITIONAL PROTECTION: Only for VidSrc.cc
const needsProtection = url.includes('vidsrc.cc')

// 🚫 AGGRESSIVE AD BLOCKING SCRIPT (Only for protected servers)
const adBlockScript = needsProtection ? `
  // ... 3 حمايات هنا ...
` : ''

// Inject base tag and protection script (if needed)
if (needsProtection) {
  html = html.replace(/<head>/i, `<head>\n${baseTag}\n${adBlockScript}`)
} else {
  html = html.replace(/<head>/i, `<head>\n${baseTag}`)
}
```

**الحمايات الثلاثة (VidSrc.cc فقط):**
1. ✅ Block window.open() - منع البوب آب
2. ✅ Block redirects - منع التحويلات
3. ✅ Remove ad elements - حذف الإعلانات من DOM

---

### 2. Frontend: Conditional Proxy في `EmbedPlayer.tsx` ✅

```typescript
const iframeUrl = (() => {
  if (!server?.url) return ''
  
  // 🛡️ VidSrc.cc only goes through protected proxy
  // Other servers load directly (faster, no protection overhead)
  const needsProtection = server.url.includes('vidsrc.cc')
  
  if (needsProtection) {
    const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || ''
    return `${API_BASE}/api/embed-proxy?url=${encodeURIComponent(server.url)}`
  }
  
  // Direct URL for other servers (no proxy = faster)
  return server.url 
})()
```

**النتيجة:**
- **VidSrc.cc** → يمر على `/api/embed-proxy` (محمي بالكامل)
- **باقي السيرفرات (12 سيرفر)** → URL مباشر (بدون proxy = أسرع)

---

### 3. Admin: Conditional Proxy في `ServerTester.tsx` ✅

```typescript
const previewUrl = useMemo(() => {
  if (!activeUrl) return null
  
  // 🛡️ VidSrc.cc only goes through protected proxy
  // Other servers load directly (faster, no protection overhead)
  const needsProtection = activeUrl.includes('vidsrc.cc')
  
  if (needsProtection) {
    const base = API_BASE ? API_BASE.replace(/\/$/, '') : ''
    return `${base}/api/embed-proxy?url=${encodeURIComponent(activeUrl)}`
  }
  
  // Direct URL for other servers (no proxy = faster)
  return activeUrl
}, [activeUrl])
```

**النتيجة:**
- في ServerTester، VidSrc.cc بس يمر على الـ proxy
- باقي السيرفرات تتحمل مباشر (أسرع في التجارب)

---

## الترتيب النهائي:

### السيرفرات (13 سيرفر):
1. **VidSrc.cc** 🛡️ (محمي - افتراضي - يمر على proxy)
2. VidSrc.net (مباشر)
3. VidSrc.io (مباشر)
4. VidSrc.xyz (مباشر)
5. VidSrc.me (مباشر)
6. **VidRock.net** 📥 (سيرفر التحميل - مباشر)
7. VidSrc.to (مباشر)
8. 2Embed.cc (مباشر)
9. 2Embed.skin (مباشر)
10. AutoEmbed.co (مباشر)
11. 111Movies (مباشر)
12. SmashyStream (مباشر)
13. VidLink (مباشر)

---

## المميزات:

### ✅ أداء محسّن جداً:
- **VidSrc.cc**: محمي بالكامل (proxy + ad blocking + CSP)
- **12 سيرفر آخرين**: تحميل مباشر = أسرع بكتير (بدون proxy overhead)

### ✅ حماية مركزة:
- السيرفر الافتراضي (VidSrc.cc) نظيف من الإعلانات
- الزائر يبدأ بتجربة ممتازة

### ✅ مرونة:
- لو الزائر غير السيرفر، هيشتغل أسرع (بدون حماية)
- سهل إضافة سيرفرات أخرى للحماية لو احتجت

### ✅ توفير موارد:
- الـ proxy بيشتغل بس لما يكون ضروري
- الـ ad blocking scripts مش بتتحقن غير في VidSrc.cc

---

## كيفية إضافة سيرفر للحماية:

لو عايز تضيف سيرفر تاني للحماية، غير الشرط في 3 أماكن:

### 1. Backend (`server/api/embed-proxy.js`):
```javascript
const needsProtection = url.includes('vidsrc.cc') || url.includes('server-name-here')
```

### 2. Frontend (`src/components/features/media/EmbedPlayer.tsx`):
```typescript
const needsProtection = server.url.includes('vidsrc.cc') || server.url.includes('server-name-here')
```

### 3. Admin (`src/pages/admin/ServerTester.tsx`):
```typescript
const needsProtection = activeUrl.includes('vidsrc.cc') || activeUrl.includes('server-name-here')
```

---

## الملفات المعدلة:

1. ✅ `server/api/embed-proxy.js` - حماية انتقائية في الـ backend
2. ✅ `src/components/features/media/EmbedPlayer.tsx` - proxy انتقائي في الموقع
3. ✅ `src/pages/admin/ServerTester.tsx` - proxy انتقائي في التجارب
4. ✅ Database - VidSrc.cc priority 1

---

## الاختبار:

### في الموقع:
1. افتح أي فيلم/مسلسل
2. السيرفر الافتراضي (VidSrc.cc) هيكون محمي
3. غير لسيرفر تاني → هيشتغل مباشر (أسرع)

### في ServerTester:
1. افتح `/admin/server-tester`
2. اختار VidSrc.cc → محمي (يمر على proxy)
3. اختار أي سيرفر تاني → مباشر (بدون proxy)

### التحقق من الحماية:
- **VidSrc.cc**: افتح DevTools → Console → هتلاقي "✅ Ad blocker initialized"
- **سيرفرات أخرى**: مفيش رسالة = تحميل مباشر

---

**Status**: ✅ Complete and Ready for Production

**Performance Impact**: 
- VidSrc.cc: Same (protected)
- Other 12 servers: **Much Faster** (direct load, no proxy overhead)

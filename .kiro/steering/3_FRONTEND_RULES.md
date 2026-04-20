# 🎨 قواعد Frontend

**آخر تحديث:** 2026-04-15  
**الأولوية:** 2 - مهم

---

## 📋 القواعد الأساسية (3 قواعد)

| القاعدة | ❌ خطأ | ✅ صحيح |
|---------|--------|---------|
| Toast | `import { toast } from 'sonner'` | `import { toast } from '../lib/toast-manager'` |
| Titles | 3 لغات (ar + en + original) | لغتين فقط (ar + en) |
| Images | `priority={true}` | `priority={index < 6 \|\| isVisible}` |

---

## 🔔 Toast Manager

### الاستخدام:
```typescript
import { toast } from '../lib/toast-manager'

toast.success('✅ تم الحفظ')
toast.error('❌ فشل')
toast.info('ℹ️ معلومة')
```

### لماذا؟
يمنع تكرار الإشعار خلال 2 ثانية.

---

## 📝 العناوين (Titles)

### الاستخدام:
```typescript
import { useTripleTitles } from '../hooks/useTripleTitles'

const titles = useTripleTitles(movie)

<h1>{titles.primary}</h1>
{titles.hasMultipleTitles && (
  <h2>{titles.arabic || titles.english}</h2>
)}
```

### القاعدة:
- عرض لغتين فقط (عربي + إنجليزي)
- لا تعرض اللغة الأصلية إذا لم تكن عربي أو إنجليزي

---

## 🖼️ الصور (Images)

### الاستخدام:
```typescript
<OptimizedImage
  src={posterPath}
  alt={title}
  priority={index < 6 || isVisible}
/>
```

### القاعدة:
- أول 6 صور: تحميل فوري
- الصور المرئية: تحميل فوري
- باقي الصور: lazy loading

---

## 🧩 المكونات الرئيسية

### OptimizedImage:
- Lazy loading ذكي
- Blur placeholder
- Error handling

### MovieCard:
- عرض العناوين بلغتين
- Lazy loading للصور
- Rating display

### QuantumTrain:
- Horizontal scrolling
- Swiper integration
- Lazy loading للكروت

---

**للمزيد:** راجع `TECHNICAL_DETAILS_HANDOVER.md`


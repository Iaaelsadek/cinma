# 🚀 SEO والأداء

**آخر تحديث:** 2026-04-15  
**الأولوية:** 3 - مرجع

---

## 🔑 SEO Keywords

### الكلمات الأساسية:
```javascript
const keywords = [
  original_title,           // الاسم الأصلي
  title_ar,                 // الاسم العربي
  `فيلم ${title_ar}`,       // فيلم + الاسم
  `مشاهدة فيلم ${title_ar}`, // مشاهدة فيلم + الاسم
  'مشاهدة', 'فيلم', 'مترجم', 'اون لاين', 'HD',
  ...genres_in_arabic,      // التصنيفات بالعربي
  release_year              // سنة الإصدار
]
```

### التصنيفات بالعربي:
```javascript
const genreTranslations = {
  'Action': 'أكشن',
  'Comedy': 'كوميدي',
  'Drama': 'دراما',
  'Horror': 'رعب',
  'Romance': 'رومانسي',
  'Sci-Fi': 'خيال علمي'
}
```

---

## 📄 Meta Tags

### الاستخدام:
```typescript
<SeoHead
  title={`${title} - Cinema.online`}
  description={overview}
  keywords={keywords}
  image={posterUrl}
  type="video.movie"
/>
```

### ما يتم إضافته:
- Open Graph tags
- Twitter Cards
- JSON-LD Schema
- Canonical URL

---

## ⚡ Performance

### تحسين الصور:
- WebP format
- Multiple sizes (w92 → original)
- Lazy loading
- Blur placeholder

### تحسين الكود:
- Code splitting
- Tree shaking
- Minification
- Compression

### الهدف:
- Load time: < 2s
- Lighthouse: > 90
- First Contentful Paint: < 1.5s

---

## 📊 Best Practices

### 1. Images:
```typescript
// ✅ استخدم أحجام مناسبة
<img 
  src={`${baseUrl}/w342${posterPath}`}
  srcSet={`
    ${baseUrl}/w185${posterPath} 185w,
    ${baseUrl}/w342${posterPath} 342w,
    ${baseUrl}/w500${posterPath} 500w
  `}
/>
```

### 2. Caching:
```javascript
// ✅ استخدم cache مع TTL
const cache = new NodeCache({ stdTTL: 300 }) // 5 دقائق
```

### 3. Database:
```sql
-- ✅ أضف indexes
CREATE INDEX idx_movies_slug ON movies(slug);
CREATE INDEX idx_movies_popularity ON movies(popularity DESC);
```

---

**للمزيد:** راجع `SEO_KEYWORDS_DATABASE.md` (القديم)


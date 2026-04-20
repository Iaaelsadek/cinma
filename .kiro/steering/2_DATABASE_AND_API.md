# 🗄️ قواعد البيانات والـ API

**آخر تحديث:** 2026-04-15  
**الأولوية:** 2 - مهم

---

## 🚨 القاعدة الأساسية

```
Supabase = Auth & User Data ONLY
CockroachDB = ALL Content
```

---

## 📊 جداول قاعدة البيانات

### Supabase (Auth فقط):
| الجدول | الاستخدام |
|--------|-----------|
| profiles | بيانات المستخدمين |
| continue_watching | متابعة المشاهدة |
| history | السجل |

### CockroachDB (المحتوى):
| الجدول | الاستخدام |
|--------|-----------|
| movies | الأفلام |
| tv_series | المسلسلات |
| seasons | المواسم |
| episodes | الحلقات |
| actors | الممثلين |
| content_moderation | الفلترة |

---

## 🔌 API Endpoints

### Movies:
```
GET  /api/movies              # قائمة
GET  /api/movies/:slug        # تفاصيل
GET  /api/movies/:slug/cast   # الممثلين
GET  /api/movies/:slug/similar # مشابهة
```

### TV Series:
```
GET  /api/tv                  # قائمة
GET  /api/tv/:slug            # تفاصيل
GET  /api/tv/:slug/seasons    # المواسم
GET  /api/tv/:slug/cast       # الممثلين
```

---

## ✅ الاستخدام الصحيح

### للمحتوى (CockroachDB):
```typescript
// ✅ صحيح
import { getMovies } from '../services/contentQueries'
const movies = await getMovies()

// ❌ خطأ
await supabase.from('movies').select('*')
```

### للمستخدمين (Supabase):
```typescript
// ✅ صحيح
const { data } = await supabase
  .from('profiles')
  .select('*')
```

---

## 🔐 الأمان

### SQL Injection Prevention:
```javascript
// ✅ صحيح - Parameterized queries
await pool.query('SELECT * FROM movies WHERE slug = $1', [slug])

// ❌ خطأ - String concatenation
await pool.query(`SELECT * FROM movies WHERE slug = '${slug}'`)
```

---

**للمزيد:** راجع `TECHNICAL_DETAILS_HANDOVER.md`


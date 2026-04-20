# 💾 دليل النسخ الاحتياطي لقاعدة البيانات

**آخر تحديث:** 2026-04-20  
**الحالة:** ✅ جاهز للاستخدام

---

## 🎯 نظرة عامة

هذا الدليل يشرح كيفية عمل backup كامل لقاعدة البيانات ونقلها لأي مكان.

---

## 📊 الحجم الحالي

```
الحجم التقديري: ~220 MB (0.22 GB)
الحجم الفعلي مع indexes: ~300-400 MB
```

---

## 💾 طرق الـ Backup

### 1. **JSON Backup (موصى به للنقل)**

**المميزات:**
- ✅ سهل القراءة والتعديل
- ✅ يعمل مع أي database
- ✅ يمكن نقله لأي مكان
- ✅ سكريبتات جاهزة

**الاستخدام:**

```bash
# عمل backup
node scripts/backup-database.js

# النتيجة: مجلد backups/ يحتوي على:
# - movies_2026-04-20.json
# - tv_series_2026-04-20.json
# - seasons_2026-04-20.json
# - episodes_2026-04-20.json
# - actors_2026-04-20.json
# - metadata_2026-04-20.json
```

**استعادة الـ Backup:**

```bash
# استعادة من backup معين
node scripts/restore-database.js 2026-04-20
```

---

### 2. **pg_dump (SQL Dump)**

**المميزات:**
- ✅ ملف SQL واحد
- ✅ يعمل مع PostgreSQL و CockroachDB
- ✅ سهل الاستعادة

**الاستخدام:**

```bash
# تثبيت PostgreSQL client tools أولاً
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt install postgresql-client

# عمل backup
pg_dump "postgresql://cinma-db:PASSWORD@prying-squid-23421.j77.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full" > backup.sql

# استعادة
psql "postgresql://..." < backup.sql
```

---

### 3. **CockroachDB BACKUP (للـ production)**

**المميزات:**
- ✅ أسرع طريقة
- ✅ حجم أصغر (compressed)
- ✅ incremental backups

**الاستخدام:**

```sql
-- في CockroachDB Console:
BACKUP DATABASE defaultdb TO 'nodelocal://1/backup-2026-04-20';

-- استعادة:
RESTORE DATABASE defaultdb FROM 'nodelocal://1/backup-2026-04-20';
```

---

## 🚀 السيناريوهات الشائعة

### السيناريو 1: نقل لـ database جديد

```bash
# 1. عمل backup من القديم
node scripts/backup-database.js

# 2. تغيير COCKROACHDB_URL في .env للـ database الجديد

# 3. استعادة في الجديد
node scripts/restore-database.js 2026-04-20
```

---

### السيناريو 2: نسخة احتياطية يومية

```bash
# أضف في cron job أو Task Scheduler:
# كل يوم الساعة 3 صباحاً
0 3 * * * cd /path/to/project && node scripts/backup-database.js
```

---

### السيناريو 3: نقل لـ server آخر

```bash
# 1. عمل backup
node scripts/backup-database.js

# 2. ضغط المجلد
tar -czf backups.tar.gz backups/

# 3. نقل الملف للـ server الجديد
scp backups.tar.gz user@server:/path/

# 4. فك الضغط
tar -xzf backups.tar.gz

# 5. استعادة
node scripts/restore-database.js 2026-04-20
```

---

## 📝 ملاحظات مهمة

### عن الحجم:

- **الحالي:** ~220 MB
- **عند 250K محتوى:** ~3-4 GB
- **عند 1M محتوى:** ~15-20 GB

### عن الوقت:

- **Backup (220 MB):** ~2-3 دقائق
- **Restore (220 MB):** ~5-10 دقائق
- **Backup (3 GB):** ~15-20 دقيقة
- **Restore (3 GB):** ~30-45 دقيقة

### عن التخزين:

- **محلي:** استخدم external hard drive
- **Cloud:** Google Drive, Dropbox, S3
- **Git:** لا تضع الـ backups في Git (كبيرة جداً)

---

## 🔐 الأمان

### حماية الـ Backups:

1. **تشفير الملفات:**
```bash
# تشفير
7z a -p backup.7z backups/

# فك التشفير
7z x backup.7z
```

2. **لا تشارك الـ backups:**
   - تحتوي على بيانات حساسة
   - تحتوي على معلومات المستخدمين

3. **احذف الـ backups القديمة:**
```bash
# احتفظ بآخر 7 نسخ فقط
find backups/ -name "*.json" -mtime +7 -delete
```

---

## 🆘 استكشاف الأخطاء

### خطأ: "Connection timeout"

**الحل:**
- تحقق من اتصال الإنترنت
- تحقق من صحة COCKROACHDB_URL

### خطأ: "Out of memory"

**الحل:**
- قلل batch size في السكريبت
- استخدم pg_dump بدلاً من JSON

### خطأ: "Table does not exist"

**الحل:**
- تأكد من أن الـ schema موجود
- أنشئ الجداول أولاً قبل الاستعادة

---

## 📋 Checklist

قبل عمل Backup:
- [ ] تحقق من اتصال الإنترنت
- [ ] تحقق من مساحة التخزين المتاحة
- [ ] أغلق السكريبتات الأخرى (ingestion)

بعد عمل Backup:
- [ ] تحقق من وجود جميع الملفات
- [ ] تحقق من حجم الملفات
- [ ] اختبر الاستعادة على database تجريبي

---

## 🎯 التوصيات

### للاستخدام اليومي:
- استخدم JSON backup (السكريبت الجاهز)
- احتفظ بآخر 7 نسخ
- اختبر الاستعادة شهرياً

### للـ Production:
- استخدم CockroachDB BACKUP
- احتفظ بنسخ في S3 أو GCS
- اختبر الاستعادة أسبوعياً

### للنقل:
- استخدم JSON backup
- ضغط الملفات قبل النقل
- تحقق من integrity بعد النقل

---

**تم الإنشاء بواسطة:** Kiro AI  
**التاريخ:** 2026-04-20  
**الحالة:** جاهز للاستخدام - السكريبتات جاهزة في `scripts/`

# Database Setup Required

The backend engine requires database schema updates to function correctly.
Please execute the following SQL scripts in your **Supabase SQL Editor**:

## 1. Fix Main Schema
Copy content from: `backend/fix_schema.sql`
Run it in Supabase SQL Editor.

## 2. Fix Links Schema
Copy content from: `backend/fix_schema_links.sql`
Run it in Supabase SQL Editor.

## 3. Verify
After running these scripts, the `movies` and `tv_series` tables should have columns like `is_active`, `arabic_title`, `embed_links`, etc.
Then you can run the master engine successfully:
```bash
python backend/master_engine.py
```

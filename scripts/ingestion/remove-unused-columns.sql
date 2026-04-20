-- ============================================================================
-- Remove Unused Columns Migration
-- ============================================================================
-- تاريخ: 2026-04-19
-- الهدف: حذف الأعمدة غير المستخدمة لتبسيط قاعدة البيانات
-- ============================================================================

-- Movies Table
ALTER TABLE movies DROP COLUMN IF EXISTS slug_ar;
ALTER TABLE movies DROP COLUMN IF EXISTS slug_en;
ALTER TABLE movies DROP COLUMN IF EXISTS content_section;
ALTER TABLE movies DROP COLUMN IF EXISTS language;
ALTER TABLE movies DROP COLUMN IF EXISTS category;
ALTER TABLE movies DROP COLUMN IF EXISTS target_audience;

-- TV Series Table
ALTER TABLE tv_series DROP COLUMN IF EXISTS slug_ar;
ALTER TABLE tv_series DROP COLUMN IF EXISTS slug_en;
ALTER TABLE tv_series DROP COLUMN IF EXISTS content_section;
ALTER TABLE tv_series DROP COLUMN IF EXISTS language;
ALTER TABLE tv_series DROP COLUMN IF EXISTS category;
ALTER TABLE tv_series DROP COLUMN IF EXISTS target_audience;

-- Drop Indexes (if they exist)
DROP INDEX IF EXISTS idx_movies_slug_ar;
DROP INDEX IF EXISTS idx_movies_slug_en;
DROP INDEX IF EXISTS idx_movies_content_section;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- بعد تشغيل هذا السكريبت، تحقق من الأعمدة المتبقية:
-- 
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'movies' ORDER BY ordinal_position;
-- 
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'tv_series' ORDER BY ordinal_position;
-- ============================================================================

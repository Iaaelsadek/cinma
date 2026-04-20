# Content Display Arabic and Similar Fix - Bugfix Design

## Overview

This bugfix addresses critical data integrity and display issues in the content system where Arabic titles, overviews, and similar content are not properly stored or displayed. The root causes are:

1. **Missing Database Columns**: `overview_ar` and `overview_en` columns exist in old schema files but not in the current production schema
2. **Incomplete Data Migration**: Arabic titles (`title_ar`) exist but contain NULL values despite Arabic text being available
3. **Empty Similar Content**: `similar_content` JSONB column exists but remains empty despite related data being available from TMDB
4. **Frontend Genre Display**: Multiple genres may not be displayed properly due to using only `genres[0]`

The fix requires database schema migration, data migration scripts, ingestion script updates, and frontend component updates.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when content has Arabic/English data available but database columns are missing or NULL
- **Property (P)**: The desired behavior - all language variants and similar content should be properly stored and displayed
- **Preservation**: Existing English title display, slug generation, and API functionality that must remain unchanged
- **overview_ar/overview_en**: Database columns for storing Arabic and English overview text separately
- **similar_content**: JSONB column storing array of similar content references from TMDB
- **title_ar**: Database column for Arabic title (exists but contains NULL values)
- **TMDB API**: The Movie Database API used to fetch content metadata including translations

## Bug Details

### Bug Condition

The bug manifests when content is ingested or displayed with incomplete language data. The system either lacks the database columns to store language-specific data, or the ingestion scripts fail to populate existing columns with available data from TMDB.

**Formal Specification:**
```
FUNCTION isBugCondition(content)
  INPUT: content of type Movie or TVSeries
  OUTPUT: boolean
  
  RETURN (content.overview_ar IS NULL OR content.overview_en IS NULL)
         OR (content.title_ar IS NULL AND content.original_language = 'ar')
         OR (content.similar_content = '[]' AND TMDB_has_similar_data(content.external_id))
         OR (frontend_displays_only_first_genre(content) AND content.genres.length > 1)
END FUNCTION
```

### Examples

**Example 1: Missing Overview Columns**
- Database Query: `SELECT overview_ar, overview_en FROM movies WHERE slug = 'kalimat-el-hak'`
- Expected: Two separate columns with Arabic and English text
- Actual: Columns do not exist in schema (ERROR: column "overview_ar" does not exist)

**Example 2: NULL Arabic Titles**
- Movie: "كلمة الحق
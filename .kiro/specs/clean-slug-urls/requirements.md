# Clean Slug URLs - Requirements Document

## Introduction

This document defines requirements for implementing professional, clean URL slugs without any ID appending or temporary workarounds. All URLs will use only the content name/title as the slug, stored permanently in the database.

## Current Problem

The system currently appends IDs to slugs as a fallback mechanism:
- ❌ `/watch/movie/spider-man-12345` (wrong - has ID)
- ❌ `/watch/movie/spider-man-2024-1480382` (wrong - has ID)
- ❌ `/series/breaking-bad-67890` (wrong - has ID)

## Expected Behavior

URLs should be clean and professional:
- ✅ `/watch/movie/spider-man` (correct - clean slug)
- ✅ `/watch/movie/spider-man-2` (correct - for sequels)
- ✅ `/watch/movie/spider-man-homecoming` (correct - clean slug)
- ✅ `/series/breaking-bad` (correct - clean slug)
- ✅ `/game/the-witcher-3` (correct - clean slug)

## Requirements

### 1. Slug Storage
**REQ-1.1**: All content in CockroachDB MUST have a clean slug stored in the `slug` column
- No IDs appended
- No numeric suffixes
- Only lowercase letters, numbers, and hyphens
- Format: `[a-z0-9-]+`

**REQ-1.2**: Slug uniqueness within content type
- Each movie must have a unique slug
- Each TV series must have a unique slug
- Each game must have a unique slug
- Duplicates resolved by appending sequence numbers (e.g., `spider-man`, `spider-man-2`, `spider-man-3`)

**REQ-1.3**: Slug generation rules
- Convert title to lowercase
- Replace spaces with hyphens
- Remove special characters
- Remove accents and diacritics
- Collapse multiple hyphens to single hyphen
- Trim hyphens from start/end

### 2. URL Generation
**REQ-2.1**: URL generation must use ONLY the slug
- No ID appending
- No fallback mechanisms
- No temporary workarounds

**REQ-2.2**: URL patterns by content type
- Movies: `/watch/movie/{slug}`
- TV Series: `/watch/tv/{slug}/s{season}/ep{episode}`
- Games: `/game/{slug}`
- Software: `/software/{slug}`
- Actors: `/actor/{slug}`
- Details pages: `/movie/{slug}`, `/series/{slug}`, etc.

**REQ-2.3**: Slug resolution
- Query database by slug to get content ID
- No ID extraction from URL
- No reverse engineering of IDs from slugs

### 3. Database Migration
**REQ-3.1**: Clean existing slugs
- Remove all ID suffixes from existing slugs
- Handle duplicates by adding sequence numbers
- Preserve slug history for redirects if needed

**REQ-3.2**: Ensure all content has valid slugs
- No NULL slugs
- No empty slugs
- No slugs with IDs

### 4. URL Routing
**REQ-4.1**: Route handlers must accept slug-only URLs
- `/watch/movie/{slug}` → resolve slug to ID → fetch content
- `/series/{slug}` → resolve slug to ID → fetch content
- No ID-based routing

**REQ-4.2**: Legacy URL handling (optional)
- Detect old URLs with IDs
- Redirect to new clean URLs
- Or reject with 404

### 5. Slug Uniqueness Strategy
**REQ-5.1**: Handle duplicate titles
- First occurrence: `spider-man`
- Second occurrence: `spider-man-2`
- Third occurrence: `spider-man-3`
- Pattern: `{base-slug}` or `{base-slug}-{sequence}`

**REQ-5.2**: Handle titles with numbers
- `Spider-Man 2` → `spider-man-2` (not `spider-man-2-2`)
- `Spider-Man: Homecoming` → `spider-man-homecoming`
- `The Dark Knight Rises` → `the-dark-knight-rises`

### 6. Backward Compatibility
**REQ-6.1**: Existing links must continue to work
- Old URLs with IDs should redirect to new clean URLs
- Or be handled gracefully with 404

**REQ-6.2**: API responses
- Return clean slugs in API responses
- No ID appending in generated URLs

## Correctness Properties

### Property 1: Slug Uniqueness
For any two different content items of the same type, their slugs MUST be different.

### Property 2: Slug Consistency
For the same content item, the slug MUST always be the same across all requests.

### Property 3: URL Cleanness
Generated URLs MUST NOT contain any numeric IDs or suffixes (except for sequence numbers in duplicates).

### Property 4: Slug Validity
All slugs MUST match the pattern `^[a-z0-9-]+$` (lowercase letters, numbers, hyphens only).

### Property 5: Slug Resolution
For any valid slug, the system MUST be able to resolve it to the correct content ID.

## Non-Functional Requirements

**Performance**:
- Slug lookup should be O(1) with database index
- Slug generation should be fast (< 100ms)

**Scalability**:
- Handle millions of content items
- Support concurrent slug generation

**Maintainability**:
- Clear slug generation logic
- Easy to debug slug issues
- Comprehensive logging

## Acceptance Criteria

- [ ] All existing slugs are cleaned (no IDs)
- [ ] All new content gets clean slugs
- [ ] URLs use only slugs (no IDs)
- [ ] Slug resolution works correctly
- [ ] Duplicate handling works correctly
- [ ] All tests pass
- [ ] No regressions in existing functionality

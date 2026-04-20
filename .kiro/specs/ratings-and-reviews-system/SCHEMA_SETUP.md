# Ratings and Reviews System - Schema Setup Guide

## Overview

This guide explains how to set up the database schema for the ratings and reviews system in Supabase.

## Database Architecture

**CRITICAL**: Follow the established architecture:
- **Supabase**: User data ONLY (ratings, reviews, likes, reports, drafts, views)
- **CockroachDB**: Content data (movies, tv_series, games, software)
- **Bridge**: `external_id` (TMDB ID as TEXT) connects user data to content

## Tables Created

### 1. `ratings`
Stores user ratings (1-10 scale) for content.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `external_id` (TEXT) - TMDB ID
- `external_source` (TEXT) - Default 'tmdb'
- `content_type` (TEXT) - 'movie', 'tv', 'game', 'software'
- `rating_value` (INTEGER) - 1-10
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Constraints:**
- UNIQUE (user_id, external_id, content_type)
- CHECK rating_value BETWEEN 1 AND 10

### 2. `reviews`
Stores user-written reviews with optional ratings.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `external_id` (TEXT) - TMDB ID
- `external_source` (TEXT) - Default 'tmdb'
- `content_type` (TEXT)
- `title` (TEXT, optional, max 200 chars)
- `review_text` (TEXT, 10-5000 chars)
- `rating` (INTEGER, optional, 1-10)
- `language` (TEXT) - 'ar' or 'en'
- `contains_spoilers` (BOOLEAN)
- `is_hidden` (BOOLEAN) - For moderation
- `is_verified` (BOOLEAN) - User watched content
- `edit_count` (INTEGER) - Max 5 edits
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Constraints:**
- UNIQUE (user_id, external_id, content_type)
- CHECK review_text LENGTH 10-5000
- CHECK title LENGTH <= 200
- CHECK language IN ('ar', 'en')

### 3. `review_likes`
Tracks "helpful" votes on reviews.

**Columns:**
- `id` (UUID, PK)
- `review_id` (UUID, FK → reviews)
- `user_id` (UUID, FK → auth.users)
- `created_at` (TIMESTAMPTZ)

**Constraints:**
- UNIQUE (review_id, user_id)

### 4. `review_reports`
User reports of inappropriate reviews.

**Columns:**
- `id` (UUID, PK)
- `review_id` (UUID, FK → reviews)
- `reporter_user_id` (UUID, FK → auth.users)
- `reason` (TEXT, 10-500 chars)
- `status` (TEXT) - 'pending', 'reviewed', 'dismissed'
- `created_at`, `reviewed_at` (TIMESTAMPTZ)
- `reviewed_by` (UUID, FK → auth.users)

**Constraints:**
- UNIQUE (review_id, reporter_user_id)

### 5. `review_drafts`
Auto-saved review drafts.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `external_id` (TEXT)
- `external_source` (TEXT)
- `content_type` (TEXT)
- `title`, `review_text`, `rating`, `language`, `contains_spoilers`
- `updated_at` (TIMESTAMPTZ)

**Constraints:**
- UNIQUE (user_id, external_id, content_type)

### 6. `review_views`
Tracks review views for helpful percentage calculation.

**Columns:**
- `id` (UUID, PK)
- `review_id` (UUID, FK → reviews)
- `user_id` (UUID, FK → auth.users, nullable)
- `viewed_at` (TIMESTAMPTZ)

## Setup Instructions

### Option 1: Supabase SQL Editor (Recommended)

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/lhpuwupbhpcqkwqugkhh
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open file: `scripts/create-ratings-reviews-schema.sql`
5. Copy entire SQL content
6. Paste into SQL Editor
7. Click **Run** button

### Option 2: Using the Setup Script

```bash
npx tsx scripts/execute-ratings-reviews-schema.ts
```

This displays instructions and verifies the SQL file exists.

## Verification

After running the schema, verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ratings', 'reviews', 'review_likes', 'review_reports', 'review_drafts', 'review_views');
```

Should return 6 rows.

## Security (RLS Policies)

All tables have Row Level Security enabled with policies:

**Users can:**
- View all ratings and non-hidden reviews
- Create/update/delete their own ratings and reviews
- Like reviews (toggle)
- Report reviews
- Manage their own drafts

**Admins can:**
- View all reviews (including hidden)
- Hide/unhide reviews
- View and manage reports

## Indexes

Performance indexes created on:
- Foreign keys (user_id, review_id)
- Query patterns (external_id + content_type)
- Sorting fields (created_at, rating)
- Full-text search (review_text + title)

## Next Steps

After schema setup:
1. ✅ Verify tables created
2. ✅ Test RLS policies
3. ⏭️ Implement backend API endpoints
4. ⏭️ Create frontend components
5. ⏭️ Add rate limiting middleware

## Troubleshooting

**Error: relation already exists**
- Tables already created, safe to ignore or drop tables first

**Error: permission denied**
- Ensure you're using service role key or have admin access

**Error: foreign key constraint**
- Ensure `auth.users` and `profiles` tables exist

## Architecture Reminder

```
┌─────────────────┐         external_id         ┌──────────────────┐
│   Supabase      │◄────────(TMDB ID)──────────►│  CockroachDB     │
│                 │                              │                  │
│  - ratings      │                              │  - movies        │
│  - reviews      │                              │  - tv_series     │
│  - review_likes │                              │  - games         │
│  - ...          │                              │  - software      │
└─────────────────┘                              └──────────────────┘
```

**Never query content tables from Supabase!**

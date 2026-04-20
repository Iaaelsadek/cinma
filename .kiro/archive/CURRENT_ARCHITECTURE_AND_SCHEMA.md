# 🏗️ Current Architecture & Schema Documentation
# Cinema.online - Data Ingestion Pipeline Reverse Engineering

**Document Version:** 1.0  
**Date:** 2026-04-02  
**Purpose:** Complete documentation of current data ingestion architecture before rebuilding from scratch

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Schema](#database-schema)
3. [Data Sources](#data-sources)
4. [Ingestion Flow & Data Mapping](#ingestion-flow--data-mapping)
5. [Slug Generation Logic](#slug-generation-logic)
6. [Relations & Associations](#relations--associations)
7. [Error Handling & Deduplication](#error-handling--deduplication)
8. [Current Issues & Pain Points](#current-issues--pain-points)
9. [Recommendations for New Pipeline](#recommendations-for-new-pipeline)

---

## 1. Executive Summary

### Current State
Cinema.online currently uses a **hybrid data ingestion system** with multiple entry points:
- **Instant Add API** - Real-time user requests with rate limiting
- **Process Request API** - Admin-processed queue system
- **Auto-Process Worker** - Background batch processing

### Database Architecture
- **Primary Database:** CockroachDB (PostgreSQL-compatible)
- **Content Storage:** ~318,000+ items (movies, TV series, games, software, actors)
- **User Data:** Supabase (authentication & user-specific data only)

### Key Challenges
1. **Inconsistent slug generation** - Multiple implementations across codebase
2. **Missing slugs** - Some content has NULL or invalid slugs
3. **Duplicate content** - Same 20 Arabic movies appearing in all sections
4. **No centralized ingestion pipeline** - Data entry scattered across multiple endpoints

---

## 2. Database Schema

### 2.1 Core Tables Structure

#### 📽️ Movies Table
```sql
CREATE TABLE movies (
  -- Primary Key
  id INTEGER PRIMARY KEY,                    -- TMDB ID (NOT auto-increment)
  
  -- Slug & Identifiers
  slug TEXT UNIQUE,                          -- URL-friendly identifier
  
  -- Basic Information
  title TEXT NOT NULL,
  original_title TEXT,
  overview TEXT,
  
  -- Media Assets
  poster_path TEXT,                          -- /path/to/poster.jpg
  backdrop_path TEXT,                        -- /path/to/backdrop.jpg
  
  -- Release & Ratings
  release_date DATE,
  vote_average FLOAT DEFAULT 0,              -- 0-10 scale
  vote_count INTEGER DEFAULT 0,
  popularity FLOAT DEFAULT 0,
  
  -- Metadata
  adult BOOLEAN DEFAULT FALSE,
  original_language TEXT,                    -- ISO 639-1 (e.g., 'en', 'ar')
  runtime INTEGER,                           -- Minutes
  status TEXT,                               -- 'Released', 'Post Production', etc.
  tagline TEXT,
  
  -- Financial
  budget BIGINT DEFAULT 0,
  revenue BIGINT DEFAULT 0,
  
  -- JSONB Fields (Rich Data)
  genres JSONB DEFAULT '[]',                 -- [{"id": 28, "name": "Action"}]
  cast_data JSONB DEFAULT '[]',              -- Top 20 cast members
  crew_data JSONB DEFAULT '[]',              -- Directors, writers, producers
  similar_content JSONB DEFAULT '[]',
  production_companies JSONB DEFAULT '[]',
  spoken_languages JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  videos JSONB DEFAULT '[]',                 -- Trailers, teasers
  images JSONB DEFAULT '[]',                 -- Posters, backdrops
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_movies_popularity ON movies (popularity DESC);
CREATE INDEX idx_movies_vote_average ON movies (vote_average DESC);
CREATE INDEX idx_movies_release_date ON movies (release_date DESC);
CREATE INDEX idx_movies_original_language ON movies (original_language);
CREATE INDEX idx_movies_genres ON movies USING GIN (genres);
CREATE INDEX idx_movies_title_trgm ON movies USING GIN (title gin_trgm_ops);
CREATE UNIQUE INDEX idx_movies_slug ON movies(slug) WHERE slug IS NOT NULL;
```

**Constraints:**
- `id` is TMDB ID (external identifier, not auto-increment)
- `slug` must be unique when not NULL
- `title` is required (NOT NULL)

#### 📺 TV Series Table
```sql
CREATE TABLE tv_series (
  -- Primary Key
  id INTEGER PRIMARY KEY,                    -- TMDB ID
  
  -- Slug & Identifiers
  slug TEXT UNIQUE,
  
  -- Basic Information
  name TEXT NOT NULL,                        -- Series name
  original_name TEXT,
  overview TEXT,
  
  -- Media Assets
  poster_path TEXT,
  backdrop_path TEXT,
  
  -- Air Dates
  first_air_date DATE,
  last_air_date DATE,
  
  -- Ratings
  vote_average FLOAT DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  popularity FLOAT DEFAULT 0,
  
  -- Series Metadata
  adult BOOLEAN DEFAULT FALSE,
  original_language TEXT,
  number_of_seasons INTEGER DEFAULT 0,
  number_of_episodes INTEGER DEFAULT 0,
  status TEXT,                               -- 'Returning Series', 'Ended', etc.
  tagline TEXT,
  type TEXT,                                 -- 'Scripted', 'Documentary', etc.
  
  -- JSONB Fields
  genres JSONB DEFAULT '[]',
  cast_data JSONB DEFAULT '[]',
  crew_data JSONB DEFAULT '[]',
  similar_content JSONB DEFAULT '[]',
  production_companies JSONB DEFAULT '[]',
  spoken_languages JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  videos JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  networks JSONB DEFAULT '[]',               -- Broadcasting networks
  seasons JSONB DEFAULT '[]',                -- Season metadata
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_tv_popularity ON tv_series (popularity DESC);
CREATE INDEX idx_tv_vote_average ON tv_series (vote_average DESC);
CREATE INDEX idx_tv_first_air_date ON tv_series (first_air_date DESC);
CREATE INDEX idx_tv_original_language ON tv_series (original_language);
CREATE INDEX idx_tv_genres ON tv_series USING GIN (genres);
CREATE INDEX idx_tv_name_trgm ON tv_series USING GIN (name gin_trgm_ops);
CREATE UNIQUE INDEX idx_tv_series_slug ON tv_series(slug) WHERE slug IS NOT NULL;
```

#### 🎮 Games Table
```sql
CREATE TABLE games (
  -- Primary Key
  id SERIAL PRIMARY KEY,                     -- Auto-increment (NOT TMDB ID)
  
  -- Slug & Identifiers
  slug TEXT UNIQUE,
  steam_id INT,                              -- Steam platform ID
  
  -- Basic Information
  title TEXT NOT NULL,
  description TEXT,
  
  -- Media Assets
  poster_url TEXT,
  backdrop_url TEXT,
  
  -- Release & Ratings
  release_date DATE,
  rating FLOAT DEFAULT 0,
  rating_count INT DEFAULT 0,
  popularity FLOAT DEFAULT 0,
  
  -- Game Metadata
  category TEXT,                             -- 'Action', 'RPG', 'Strategy', etc.
  developer TEXT,
  publisher TEXT,
  website TEXT,
  metacritic_score INT,
  
  -- JSONB Fields
  platform JSONB,                            -- ['PC', 'PS5', 'Xbox']
  genres JSONB,
  tags JSONB,
  system_requirements JSONB,
  screenshots JSONB,
  videos JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Differences:**
- Uses `SERIAL` (auto-increment) instead of external ID
- No TMDB integration - likely uses RAWG or IGDB API
- Different field names: `poster_url` instead of `poster_path`

#### 💻 Software Table
```sql
CREATE TABLE software (
  -- Primary Key
  id SERIAL PRIMARY KEY,                     -- Auto-increment
  
  -- Slug & Identifiers
  slug TEXT UNIQUE,
  
  -- Basic Information
  title TEXT NOT NULL,
  description TEXT,
  version TEXT,
  
  -- Media Assets
  poster_url TEXT,
  backdrop_url TEXT,
  
  -- Release & Ratings
  release_date DATE,
  rating FLOAT DEFAULT 0,
  rating_count INT DEFAULT 0,
  popularity FLOAT DEFAULT 0,
  
  -- Software Metadata
  category TEXT,                             -- 'Productivity', 'Development', etc.
  developer TEXT,
  publisher TEXT,
  license_type TEXT,                         -- 'Free', 'Open Source', 'Commercial'
  price FLOAT,
  website TEXT,
  download_url TEXT,
  file_size TEXT,
  
  -- JSONB Fields
  platform JSONB,                            -- ['Windows', 'macOS', 'Linux']
  features JSONB,
  screenshots JSONB,
  videos JSONB,
  system_requirements JSONB,
  languages JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 🎭 Actors Table
```sql
CREATE TABLE actors (
  -- Primary Key
  id SERIAL PRIMARY KEY,                     -- Auto-increment internal ID
  tmdb_id INT UNIQUE NOT NULL,               -- TMDB Person ID (external)
  
  -- Slug & Identifiers
  slug TEXT UNIQUE,
  imdb_id TEXT,                              -- IMDb ID (e.g., 'nm0000123')
  
  -- Basic Information
  name TEXT NOT NULL,
  original_name TEXT,
  biography TEXT,
  
  -- Media Assets
  profile_path TEXT,                         -- Profile photo path
  
  -- Personal Information
  birthday DATE,
  deathday DATE,
  place_of_birth TEXT,
  gender INT,                                -- 0=Not set, 1=Female, 2=Male, 3=Non-binary
  
  -- Career Information
  known_for_department TEXT,                 -- 'Acting', 'Directing', etc.
  popularity FLOAT DEFAULT 0,
  adult BOOLEAN DEFAULT FALSE,
  homepage TEXT,
  
  -- JSONB Fields
  also_known_as JSONB,                       -- Alternative names
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_actors_popularity ON actors (popularity DESC);
CREATE INDEX idx_actors_tmdb_id ON actors (tmdb_id);
CREATE UNIQUE INDEX idx_actors_slug ON actors(slug) WHERE slug IS NOT NULL;
```

**Key Notes:**
- Uses both internal `id` (SERIAL) and external `tmdb_id`
- `tmdb_id` has UNIQUE constraint
- Gender stored as integer (TMDB convention)

#### 📊 Supporting Tables

##### Seasons Table (TV Series Children)
```sql
CREATE TABLE seasons (
  id SERIAL PRIMARY KEY,
  series_id INTEGER NOT NULL,                -- FK to tv_series.id
  season_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  poster_path TEXT,
  air_date DATE,
  episode_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (series_id) REFERENCES tv_series(id) ON DELETE CASCADE
);

CREATE INDEX idx_seasons_series_id ON seasons(series_id);
CREATE INDEX idx_seasons_season_number ON seasons(season_number);
```

##### Episodes Table (Season Children)
```sql
CREATE TABLE episodes (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL,                -- FK to seasons.id
  episode_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  still_path TEXT,                           -- Episode thumbnail
  air_date DATE,
  vote_average FLOAT DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  runtime INTEGER,                           -- Minutes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

CREATE INDEX idx_episodes_season_id ON episodes(season_id);
CREATE INDEX idx_episodes_episode_number ON episodes(episode_number);
```

##### Utility Tables

**Requests Table** (Content Request Queue)
```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT,
  user_id TEXT,                              -- IP address or user ID
  status TEXT DEFAULT 'pending',             -- 'pending', 'processed', 'failed'
  media_type TEXT,                           -- 'movie', 'tv'
  tmdb_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT
);

CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created_at ON requests(created_at);
```

**Rate Limits Table** (User Rate Limiting)
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_ip ON rate_limits(ip_address);
CREATE INDEX idx_rate_limits_created_at ON rate_limits(created_at);
```

**Global Rate Limits Table** (System-wide Rate Limiting)
```sql
CREATE TABLE global_rate_limits (
  id VARCHAR(50) PRIMARY KEY,                -- 'global'
  request_count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW()
);
```

**Error Reports Table** (404 Tracking)
```sql
CREATE TABLE error_reports (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_reports_url ON error_reports(url);
```

### 2.2 Database Constraints Summary

#### Primary Keys
| Table | Primary Key | Type | Notes |
|-------|-------------|------|-------|
| movies | id | INTEGER | TMDB ID (external) |
| tv_series | id | INTEGER | TMDB ID (external) |
| games | id | SERIAL | Auto-increment (internal) |
| software | id | SERIAL | Auto-increment (internal) |
| actors | id | SERIAL | Auto-increment (internal) |
| seasons | id | SERIAL | Auto-increment (internal) |
| episodes | id | SERIAL | Auto-increment (internal) |
| requests | id | UUID | Auto-generated UUID |

#### Foreign Keys
| Child Table | Column | References | On Delete |
|-------------|--------|------------|-----------|
| seasons | series_id | tv_series(id) | CASCADE |
| episodes | season_id | seasons(id) | CASCADE |

**Note:** No foreign keys exist for actors, genres, or cast relationships. These are stored as JSONB arrays within the parent table.

#### Unique Constraints
| Table | Column | Constraint Type | Notes |
|-------|--------|----------------|-------|
| movies | slug | UNIQUE (partial) | WHERE slug IS NOT NULL |
| tv_series | slug | UNIQUE (partial) | WHERE slug IS NOT NULL |
| games | slug | UNIQUE | Full constraint |
| software | slug | UNIQUE | Full constraint |
| actors | slug | UNIQUE | Full constraint |
| actors | tmdb_id | UNIQUE | External ID uniqueness |

#### NOT NULL Constraints
| Table | Required Columns |
|-------|------------------|
| movies | id, title |
| tv_series | id, name |
| games | id, title |
| software | id, title |
| actors | id, tmdb_id, name |
| seasons | id, series_id, season_number |
| episodes | id, season_id, episode_number |

### 2.3 JSONB Field Structures

#### Genres Field Structure
```json
[
  {
    "id": 28,
    "name": "Action"
  },
  {
    "id": 12,
    "name": "Adventure"
  }
]
```

#### Cast Data Field Structure
```json
[
  {
    "id": 500,
    "name": "Tom Cruise",
    "character": "Ethan Hunt",
    "profile_path": "/path/to/profile.jpg",
    "order": 0
  }
]
```
**Limit:** Top 20 cast members

#### Crew Data Field Structure
```json
[
  {
    "id": 525,
    "name": "Christopher Nolan",
    "job": "Director",
    "department": "Directing",
    "profile_path": "/path/to/profile.jpg"
  }
]
```
**Filtered Jobs:** Director, Writer, Producer, Executive Producer  
**Limit:** Top 20 crew members

#### Videos Field Structure
```json
[
  {
    "id": "abc123",
    "key": "dQw4w9WgXcQ",
    "name": "Official Trailer",
    "site": "YouTube",
    "type": "Trailer",
    "official": true
  }
]
```
**Filter:** YouTube only  
**Limit:** 10 videos

#### Keywords Field Structure
```json
[
  {
    "id": 9715,
    "name": "superhero"
  },
  {
    "id": 849,
    "name": "dc comics"
  }
]
```
**Limit:** 20 keywords

#### Seasons Field Structure (TV Series)
```json
[
  {
    "id": 12345,
    "season_number": 1,
    "name": "Season 1",
    "overview": "First season description",
    "poster_path": "/path/to/poster.jpg",
    "air_date": "2020-01-15",
    "episode_count": 10
  }
]
```
**Filter:** season_number >= 0 (excludes specials with negative numbers)

### 2.4 Relations Network

#### Entity Relationship Diagram (Textual)

```
┌─────────────┐
│   movies    │
│  (318K+)    │
└─────────────┘
      │
      │ (JSONB - No FK)
      ├─── genres []
      ├─── cast_data []
      ├─── crew_data []
      ├─── keywords []
      ├─── videos []
      └─── images []

┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ tv_series   │ 1───N   │   seasons   │ 1───N   │  episodes   │
│             │────────▶│             │────────▶│             │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │                       │
      │ (JSONB)              │                       │
      ├─── genres []          │                       │
      ├─── cast_data []       │                       │
      ├─── crew_data []       │                       │
      ├─── networks []        │                       │
      └─── seasons []         │                       │
           (metadata)         │                       │
                             │                       │
                    series_id (FK)           season_id (FK)
                    ON DELETE CASCADE        ON DELETE CASCADE

┌─────────────┐
│   actors    │
│             │
└─────────────┘
      │
      │ (JSONB)
      └─── also_known_as []

┌─────────────┐
│    games    │
└─────────────┘
      │
      │ (JSONB)
      ├─── platform []
      ├─── genres []
      ├─── tags []
      └─── screenshots []

┌─────────────┐
│  software   │
└─────────────┘
      │
      │ (JSONB)
      ├─── platform []
      ├─── features []
      └─── languages []
```

#### Relationship Types

**One-to-Many (with Foreign Keys):**
- `tv_series` → `seasons` (1:N)
- `seasons` → `episodes` (1:N)

**Many-to-Many (via JSONB - No Junction Tables):**
- `movies` ↔ `genres` (stored as JSONB array in movies)
- `movies` ↔ `actors` (stored as cast_data JSONB in movies)
- `tv_series` ↔ `genres` (stored as JSONB array in tv_series)
- `tv_series` ↔ `actors` (stored as cast_data JSONB in tv_series)

**No Direct Relations:**
- Actors table is standalone
- No junction tables for cast/crew
- All associations stored as denormalized JSONB

### 2.5 Current Database Volume

Based on health check endpoint (`/api/db/health`):

| Table | Approximate Count | Notes |
|-------|------------------|-------|
| movies | ~200,000+ | Primary content |
| tv_series | ~100,000+ | TV shows |
| games | ~10,000+ | Gaming content |
| software | ~5,000+ | Software catalog |
| actors | ~3,000+ | Person database |
| **Total Content** | **~318,000+** | All media items |

**Storage Estimates:**
- Average movie record: ~5-10 KB (with JSONB)
- Average TV series record: ~8-15 KB (with seasons JSONB)
- Total estimated size: ~2-3 GB (content only, excluding indexes)

**Index Overhead:**
- GIN indexes (JSONB): ~20-30% of data size
- B-tree indexes: ~10-15% of data size
- Total with indexes: ~3-4 GB estimated

---

## 3. Data Sources

### 3.1 Primary Data Sources

#### 🎬 TMDB (The Movie Database)
**Used For:** Movies, TV Series, Actors

**API Base URL:** `https://api.themoviedb.org/3`

**Authentication:** API Key (Bearer token)
```env
VITE_TMDB_API_KEY=your_api_key_here
```

**Key Endpoints Used:**
```
GET /movie/{id}?language=ar&append_to_response=credits,videos,keywords
GET /tv/{id}?language=ar&append_to_response=credits,videos,keywords,seasons
GET /person/{id}?language=ar
GET /search/movie?query={title}&language=ar
GET /search/tv?query={title}&language=ar
GET /trending/{media_type}/week
GET /discover/movie?with_genres={ids}
GET /discover/tv?with_genres={ids}
```

**Language Strategy:**
- Primary: Arabic (`ar-SA`)
- Fallback: English (`en-US`)
- Uses `localizeField()` function to prefer Arabic over English

**Rate Limits:**
- 40 requests per 10 seconds
- No explicit rate limiting implemented in current code

#### 🎮 Games Data Source
**Status:** Not clearly defined in current codebase

**Likely Sources:**
- RAWG API (rawg.io)
- IGDB API (igdb.com)
- Steam API

**Current Implementation:** Manual entry or placeholder data

#### 💻 Software Data Source
**Status:** Not clearly defined in current codebase

**Likely Sources:**
- Manual curation
- GitHub API (for open source)
- AlternativeTo API

**Current Implementation:** Manual entry or placeholder data

### 3.2 Image Assets

**TMDB Image Base URL:**
```
https://image.tmdb.org/t/p/original{path}
```

**Image Types:**
- Posters: `/path/to/poster.jpg`
- Backdrops: `/path/to/backdrop.jpg`
- Profiles: `/path/to/profile.jpg`
- Stills (episodes): `/path/to/still.jpg`

**Image Processing:**
- All paths normalized to full URLs during ingestion
- Function: `normalizeImagePath(path)`
- Handles both relative paths and full URLs

---

## 4. Ingestion Flow & Data Mapping

### 4.1 Ingestion Entry Points

The system has **3 distinct entry points** for data ingestion:

#### Entry Point 1: Instant Add API
**File:** `server/api/instant-add.js`  
**Endpoint:** `POST /api/instant-add`  
**Purpose:** Real-time user requests with rate limiting

**Flow:**
```
User Request
    ↓
Rate Limit Check (User: 20/24h, Global: 200/h)
    ↓
[If Global Limit OK] → Fetch from TMDB → Insert to DB → Return Success
    ↓
[If Global Limit Exceeded] → Queue to requests table → Return Queued
```

**Rate Limits:**
- User: 20 requests per 24 hours (per IP)
- Global: 200 requests per hour (system-wide)

**Request Body:**
```json
{
  "tmdbId": 550,
  "mediaType": "movie",
  "title": "Fight Club",
  "notes": "User request"
}
```

#### Entry Point 2: Process Request API
**File:** `server/api/process-request.js`  
**Endpoint:** `POST /api/admin/process-request`  
**Purpose:** Admin-processed queue with full metadata

**Flow:**
```
Admin Action
    ↓
Authenticate (Supabase Auth + Role Check)
    ↓
Fetch Request from requests table
    ↓
[If tmdb_id provided] → Fetch TMDB Details
[If no tmdb_id] → Search TMDB by title → Use first result
    ↓
Fetch Arabic Data (language=ar)
    ↓
Fetch English Data (language=en) as fallback
    ↓
Normalize Data (localizeField for Arabic preference)
    ↓
Check Duplicate (by tmdb_id)
    ↓
[If exists] → UPDATE
[If new] → INSERT
    ↓
Update request status to 'processed'
```

**Authentication:**
- Requires Bearer token
- Validates with Supabase Auth
- Checks user role (admin or supervisor)

**Request Body:**
```json
{
  "request_id": "uuid-here",
  "media_type": "movie",
  "tmdb_id": 550
}
```

#### Entry Point 3: Auto-Process Worker
**File:** `server/workers/auto-process-requests.js`  
**Purpose:** Background batch processing of queued requests

**Schedule:** Every 5 minutes

**Flow:**
```
Cron Trigger (5 min interval)
    ↓
Check Global Rate Limit
    ↓
Calculate Available Slots (min(available, BATCH_SIZE=10))
    ↓
Fetch Pending Requests (ORDER BY created_at ASC)
    ↓
For Each Request:
    ├─ Fetch from TMDB
    ├─ Insert to Database
    ├─ Update status to 'processed'
    └─ [On Error] Update status to 'failed'
    ↓
Increment Global Rate Limit Counter
```

**Batch Processing:**
- Batch size: 10 requests per run
- Respects global rate limit
- Processes oldest requests first (FIFO)

### 4.2 Data Mapping: TMDB → Database

#### Movie Mapping

**TMDB Response Structure:**
```json
{
  "id": 550,
  "title": "Fight Club",
  "original_title": "Fight Club",
  "overview": "A ticking-time-bomb insomniac...",
  "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "backdrop_path": "/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg",
  "release_date": "1999-10-15",
  "vote_average": 8.4,
  "vote_count": 26000,
  "popularity": 61.416,
  "runtime": 139,
  "genres": [
    {"id": 18, "name": "Drama"}
  ],
  "credits": {
    "cast": [...],
    "crew": [...]
  },
  "videos": {
    "results": [...]
  },
  "keywords": {
    "keywords": [...]
  }
}
```

**Normalization Function:** `normalizeMovie(tmdbMovie, arabicData)`

**Mapping Logic:**
```javascript
{
  // Direct mappings
  id: tmdbMovie.id,
  title: localizeField(arabicData?.title, tmdbMovie.title),
  original_title: tmdbMovie.original_title || tmdbMovie.title,
  overview: localizeField(arabicData?.overview, tmdbMovie.overview),
  
  // Image normalization
  poster_path: normalizeImagePath(tmdbMovie.poster_path),
  backdrop_path: normalizeImagePath(tmdbMovie.backdrop_path),
  
  // Dates and numbers
  release_date: tmdbMovie.release_date || null,
  vote_average: tmdbMovie.vote_average || 0,
  vote_count: tmdbMovie.vote_count || 0,
  popularity: tmdbMovie.popularity || 0,
  runtime: tmdbMovie.runtime || null,
  
  // JSONB transformations
  genres: extractGenres(tmdbMovie.genres),
  cast_data: extractCastData(tmdbMovie.credits),
  crew_data: extractCrewData(tmdbMovie.credits),
  videos: extractVideos(tmdbMovie.videos),
  keywords: extractKeywords(tmdbMovie.keywords),
  
  // Metadata
  original_language: tmdbMovie.original_language || 'en',
  status: tmdbMovie.status || 'Released',
  tagline: localizeField(arabicData?.tagline, tmdbMovie.tagline),
  budget: tmdbMovie.budget || 0,
  revenue: tmdbMovie.revenue || 0
}
```

#### TV Series Mapping

**TMDB Response Structure:**
```json
{
  "id": 1399,
  "name": "Game of Thrones",
  "original_name": "Game of Thrones",
  "overview": "Seven noble families fight...",
  "poster_path": "/path.jpg",
  "backdrop_path": "/path.jpg",
  "first_air_date": "2011-04-17",
  "last_air_date": "2019-05-19",
  "vote_average": 8.4,
  "vote_count": 15000,
  "popularity": 369.594,
  "number_of_seasons": 8,
  "number_of_episodes": 73,
  "status": "Ended",
  "type": "Scripted",
  "genres": [...],
  "seasons": [...],
  "credits": {...},
  "videos": {...},
  "keywords": {...}
}
```

**Normalization Function:** `normalizeTvSeries(tmdbTv, arabicData)`

**Mapping Logic:**
```javascript
{
  id: tmdbTv.id,
  name: localizeField(arabicData?.name, tmdbTv.name),
  original_name: tmdbTv.original_name || tmdbTv.name,
  overview: localizeField(arabicData?.overview, tmdbTv.overview),
  poster_path: normalizeImagePath(tmdbTv.poster_path),
  backdrop_path: normalizeImagePath(tmdbTv.backdrop_path),
  first_air_date: tmdbTv.first_air_date || null,
  last_air_date: tmdbTv.last_air_date || null,
  vote_average: tmdbTv.vote_average || 0,
  vote_count: tmdbTv.vote_count || 0,
  popularity: tmdbTv.popularity || 0,
  number_of_seasons: tmdbTv.number_of_seasons || 0,
  number_of_episodes: tmdbTv.number_of_episodes || 0,
  genres: extractGenres(tmdbTv.genres),
  original_language: tmdbTv.original_language || 'en',
  status: tmdbTv.status || 'Ended',
  tagline: localizeField(arabicData?.tagline, tmdbTv.tagline),
  type: tmdbTv.type || null,
  seasons: extractSeasons(tmdbTv.seasons),
  cast_data: extractCastData(tmdbTv.credits),
  crew_data: extractCrewData(tmdbTv.credits),
  videos: extractVideos(tmdbTv.videos),
  keywords: extractKeywords(tmdbTv.keywords)
}
```

### 4.3 Data Transformation Functions

#### localizeField(arabicValue, englishValue)
**Purpose:** Prefer Arabic content over English

**Logic:**
```javascript
function localizeField(arabicValue, englishValue) {
  const arabic = arabicValue?.trim()
  const english = englishValue?.trim()
  
  if (arabic && arabic.length > 0) return arabic
  if (english && english.length > 0) return english
  return ''
}
```

**Usage:**
- title/name fields
- overview fields
- tagline fields

#### normalizeImagePath(path)
**Purpose:** Convert TMDB relative paths to full URLs

**Logic:**
```javascript
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original'

function normalizeImagePath(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path  // Already full URL
  return `${TMDB_IMAGE_BASE_URL}${path}`
}
```

**Input:** `/abc123.jpg`  
**Output:** `https://image.tmdb.org/t/p/original/abc123.jpg`

#### extractGenres(genres)
**Purpose:** Convert TMDB genres to database format

**Input:**
```json
[
  {"id": 28, "name": "Action"},
  {"id": 12, "name": "Adventure"}
]
```

**Output (JSON string):**
```json
"[{\"id\":28,\"name\":\"Action\"},{\"id\":12,\"name\":\"Adventure\"}]"
```

**Storage:** JSONB column in database

#### extractCastData(credits)
**Purpose:** Extract top 20 cast members

**Logic:**
```javascript
function extractCastData(credits) {
  if (!credits?.cast || credits.cast.length === 0) return '[]'
  
  const cast = credits.cast.slice(0, 20).map(member => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profile_path: normalizeImagePath(member.profile_path),
    order: member.order
  }))
  
  return JSON.stringify(cast)
}
```

**Limit:** Top 20 cast members (by order)

#### extractCrewData(credits)
**Purpose:** Extract key crew members

**Logic:**
```javascript
function extractCrewData(credits) {
  if (!credits?.crew || credits.crew.length === 0) return '[]'
  
  const crew = credits.crew
    .filter(member => 
      ['Director', 'Writer', 'Producer', 'Executive Producer']
      .includes(member.job)
    )
    .slice(0, 20)
    .map(member => ({
      id: member.id,
      name: member.name,
      job: member.job,
      department: member.department,
      profile_path: normalizeImagePath(member.profile_path)
    }))
  
  return JSON.stringify(crew)
}
```

**Filtered Jobs:**
- Director
- Writer
- Producer
- Executive Producer

**Limit:** 20 crew members

#### extractVideos(videos)
**Purpose:** Extract YouTube trailers and teasers

**Logic:**
```javascript
function extractVideos(videos) {
  if (!videos?.results || videos.results.length === 0) return '[]'
  
  const videoList = videos.results
    .filter(video => video.site === 'YouTube')
    .slice(0, 10)
    .map(video => ({
      id: video.id,
      key: video.key,              // YouTube video ID
      name: video.name,
      site: video.site,
      type: video.type,             // 'Trailer', 'Teaser', etc.
      official: video.official
    }))
  
  return JSON.stringify(videoList)
}
```

**Filter:** YouTube only  
**Limit:** 10 videos

#### extractKeywords(keywords)
**Purpose:** Extract content keywords/tags

**Logic:**
```javascript
function extractKeywords(keywords) {
  if (!keywords) return '[]'
  
  const keywordList = keywords.keywords || keywords.results || []
  
  if (keywordList.length === 0) return '[]'
  
  const formatted = keywordList.slice(0, 20).map(kw => ({
    id: kw.id,
    name: kw.name
  }))
  
  return JSON.stringify(formatted)
}
```

**Note:** TMDB returns keywords in different formats:
- Movies: `keywords.keywords`
- TV: `keywords.results`

**Limit:** 20 keywords

#### extractSeasons(seasons)
**Purpose:** Extract season metadata for TV series

**Logic:**
```javascript
function extractSeasons(seasons) {
  if (!seasons || seasons.length === 0) return '[]'
  
  const seasonList = seasons
    .filter(season => season.season_number >= 0)  // Exclude specials
    .map(season => ({
      id: season.id,
      season_number: season.season_number,
      name: season.name,
      overview: season.overview,
      poster_path: normalizeImagePath(season.poster_path),
      air_date: season.air_date || '',
      episode_count: season.episode_count
    }))
  
  return JSON.stringify(seasonList)
}
```

**Filter:** `season_number >= 0` (excludes specials with negative numbers)  
**Storage:** JSONB in tv_series table (metadata only)  
**Note:** Full season/episode data stored in separate `seasons` and `episodes` tables

---

## 5. Slug Generation Logic

### 5.1 Current Slug Generation (Multiple Implementations)

The system has **3 different slug generation implementations** across the codebase:

#### Implementation 1: Instant Add API
**File:** `server/api/instant-add.js`  
**Function:** Inline in `insertContent()`

**Algorithm:**
```javascript
// Step 1: Basic slugify
let baseSlug = title
  .toLowerCase()
  .trim()
  .replace(/[\s\W|_]+/g, '-')    // Replace spaces/special chars with -
  .replace(/^-+|-+$/g, '');       // Trim - from ends

if (!baseSlug) baseSlug = 'content';

// Step 2: Check if slug exists
let slug = baseSlug;
const existing = await query(
  `SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, 
  [slug, tmdbData.id]
);

// Step 3: Add year if duplicate
if (existing.rows.length > 0) {
  const year = extractYear(tmdbData.release_date || tmdbData.first_air_date);
  if (year && !isNaN(year)) {
    slug = `${baseSlug}-${year}`;
    const existingYear = await query(
      `SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, 
      [slug, tmdbData.id]
    );
    
    // Step 4: Add ID if still duplicate
    if (existingYear.rows.length > 0) {
      slug = `${baseSlug}-${year}-${tmdbData.id}`;
    }
  } else {
    slug = `${baseSlug}-${tmdbData.id}`;
  }
}
```

**Pattern:** `title` → `title-year` → `title-year-id`

#### Implementation 2: Save TMDB Endpoint
**File:** `server/api/db.js`  
**Endpoint:** `POST /api/db/save-tmdb`

**Algorithm:**
```javascript
// Step 1: Generate base slug
let slug = title
  .toLowerCase()
  .trim()
  .replace(/[\s\W|_]+/g, '-')
  .replace(/^-+|-+$/g, '');

if (!slug) slug = 'content-' + tmdbId;

// Step 2: Add year for uniqueness
let baseSlug = year && Number.isFinite(year) 
  ? `${slug}-${year}` 
  : slug;

// Step 3: Handle duplicates with counter
let finalSlug = baseSlug;
let isUnique = false;
let counter = 1;

while (!isUnique) {
  const existing = await query(
    `SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, 
    [finalSlug, tmdbId]
  );
  
  if (existing.rows.length === 0) {
    isUnique = true;
  } else {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }
}
```

**Pattern:** `title-year` → `title-year-2` → `title-year-3` → ...

#### Implementation 3: Slug Generate Endpoint
**File:** `server/api/db.js`  
**Endpoint:** `POST /api/db/slug/generate`

**Algorithm:**
```javascript
// Fetch items without slugs
const items = await query(`
  SELECT id, ${titleColumn} as title, release_date, first_air_date
  FROM ${table}
  WHERE (slug IS NULL OR slug = '' OR slug = '-1')
  LIMIT $1
`, [limit]);

// For each item
for (const item of items.rows) {
  const title = item.title || item.name || '';
  if (!title) continue;
  
  const releaseDate = item.release_date || item.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  
  // Slugify
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/[\s\W|_]+/g, '-')
    .replace(/^-+|-+$/g, '');
    
  if (!slug) slug = 'content-' + item.id;
  
  // Add year
  let baseSlug = year && Number.isFinite(year) 
    ? `${slug}-${year}` 
    : slug;
  
  // Deduplication loop
  let finalSlug = baseSlug;
  let isUnique = false;
  let counter = 1;

  while (!isUnique) {
    const existing = await query(
      `SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, 
      [finalSlug, item.id]
    );
    
    if (existing.rows.length === 0) {
      isUnique = true;
    } else {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  await query(
    `UPDATE ${table} SET slug = $1 WHERE id = $2`, 
    [finalSlug, item.id]
  );
}
```

**Pattern:** `title-year` → `title-year-2` → `title-year-3` → ...

### 5.2 Slug Cleaning Operations

#### Clean Slugs Script
**File:** `scripts/clean-slugs-FINAL-CORRECT.sql`

**Purpose:** Remove ID suffixes from slugs (e.g., `-123456`)

**Process:**
```sql
-- Step 1: Drop unique indexes
DROP INDEX IF EXISTS idx_movies_slug CASCADE;
DROP INDEX IF EXISTS idx_tv_series_slug CASCADE;

-- Step 2: Clean slugs (remove 5+ digit suffixes)
UPDATE movies 
SET slug = regexp_replace(slug, '-\d{5,}$', '') 
WHERE slug ~ '-\d{5,}$';

-- Step 3: Handle duplicates with ranking
WITH ranked AS (
  SELECT id, slug, 
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
  FROM movies
)
UPDATE movies m 
SET slug = CASE 
  WHEN r.rn = 1 THEN r.slug 
  ELSE r.slug || '-' || r.rn 
END
FROM ranked r 
WHERE m.id = r.id 
  AND r.slug IN (
    SELECT slug FROM movies 
    GROUP BY slug HAVING COUNT(*) > 1
  );

-- Step 4: Recreate unique indexes
CREATE UNIQUE INDEX idx_movies_slug ON movies(slug);
```

**Pattern After Cleaning:**
- First occurrence: `title-year`
- Duplicates: `title-year-2`, `title-year-3`, etc.

### 5.3 Slug Issues in Current System

**Problem 1: Inconsistent Generation**
- 3 different implementations
- Different deduplication strategies
- No centralized slug service

**Problem 2: Missing Slugs**
- Some content has `slug = NULL`
- Some content has `slug = ''`
- Some content has `slug = 'content'`
- Some content has `slug = '-1'`

**Problem 3: Arabic/Special Characters**
- Current regex: `/[\s\W|_]+/g` removes ALL non-word characters
- Arabic characters treated as special characters
- Result: Arabic titles become empty slugs or `content-{id}`

**Example:**
```
Title: "مأوى"
Current Slug: "content-1290821" (Arabic removed)
Expected: "mawy" or transliterated version
```

**Problem 4: Duplicate Content**
- Same movies appearing with different slugs
- No TMDB ID uniqueness check before slug generation
- Cleaning script creates numbered duplicates instead of merging

---

## 6. Relations & Associations

### 6.1 Hierarchical Relations (with Foreign Keys)

#### TV Series → Seasons → Episodes

**Cascade Structure:**
```
tv_series (id: 1399)
    ↓ series_id FK (ON DELETE CASCADE)
seasons (id: 3624, series_id: 1399, season_number: 1)
    ↓ season_id FK (ON DELETE CASCADE)
episodes (id: 63056, season_id: 3624, episode_number: 1)
```

**Queries:**
```sql
-- Get all seasons for a series
SELECT * FROM seasons 
WHERE series_id = $1 
ORDER BY season_number ASC;

-- Get all episodes for a season
SELECT * FROM episodes 
WHERE season_id = $1 
ORDER BY episode_number ASC;
```

**Cascade Behavior:**
- Deleting a TV series deletes all its seasons
- Deleting a season deletes all its episodes

### 6.2 Denormalized Relations (JSONB - No Foreign Keys)

#### Movies/TV Series ↔ Genres

**Storage:** JSONB array in parent table

**Structure:**
```json
{
  "genres": [
    {"id": 28, "name": "Action"},
    {"id": 12, "name": "Adventure"}
  ]
}
```

**Query Examples:**
```sql
-- Find movies with specific genre
SELECT * FROM movies 
WHERE genres::text ILIKE '%28%';

-- Find movies with Action OR Adventure
SELECT * FROM movies 
WHERE genres::text SIMILAR TO '%(28|12)%';

-- GIN index search (faster)
SELECT * FROM movies 
WHERE genres @> '[{"id": 28}]'::jsonb;
```

**Pros:**
- Fast reads (no joins)
- Simple structure
- Embedded in parent record

**Cons:**
- No referential integrity
- Genre updates require updating all records
- Cannot query "all movies for genre X" efficiently
- Duplicate genre data across records

#### Movies/TV Series ↔ Cast/Crew (Actors)

**Storage:** JSONB arrays in parent table

**Structure:**
```json
{
  "cast_data": [
    {
      "id": 500,
      "name": "Tom Cruise",
      "character": "Ethan Hunt",
      "profile_path": "https://image.tmdb.org/t/p/original/path.jpg",
      "order": 0
    }
  ],
  "crew_data": [
    {
      "id": 525,
      "name": "Christopher Nolan",
      "job": "Director",
      "department": "Directing",
      "profile_path": "https://image.tmdb.org/t/p/original/path.jpg"
    }
  ]
}
```

**Relationship Type:** Denormalized (no junction table)

**Implications:**
- Actor data duplicated across all movies/series
- No way to query "all movies for actor X" efficiently
- Actor updates in `actors` table don't propagate to cast_data
- `actors` table is essentially standalone/disconnected

**Current Usage:**
- `actors` table: Standalone actor profiles
- `cast_data`/`crew_data`: Embedded in movies/tv_series for display

**No Synchronization:** Changes to actors table don't update cast_data in movies

### 6.3 Missing Relations

**No Junction Tables For:**
- Movies ↔ Actors (cast)
- Movies ↔ Actors (crew)
- Movies ↔ Genres
- TV Series ↔ Actors
- TV Series ↔ Genres
- Movies ↔ Production Companies
- Movies ↔ Keywords

**Everything stored as JSONB arrays** - fully denormalized approach

---

## 7. Error Handling & Deduplication

### 7.1 Connection Error Handling

#### Retry Logic with Exponential Backoff
**File:** `server/api/db.js`  
**Function:** `query(text, params)`

**Implementation:**
```javascript
async function query(text, params) {
  const currentPool = getPool();
  const maxRetries = 3;
  const baseDelay = 100; // milliseconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await currentPool.connect()
      try {
        return await client.query(text, params)
      } finally {
        client.release()
      }
    } catch (error) {
      // Check if error is a connection timeout
      const isTimeout = 
        error.message?.includes('connection timeout') || 
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('Connection terminated')
      
      // Only retry on timeout errors
      if (isTimeout && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        // Delays: 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
}
```

**Retry Strategy:**
- Max retries: 3
- Delays: 100ms → 200ms → 400ms (exponential backoff)
- Only retries on timeout errors
- SQL syntax errors fail immediately

#### Database Availability Check
```javascript
let dbAvailable = null
let dbAvailableCheckedAt = 0

async function checkDB() {
  const now = Date.now()
  // Cache availability status for 30 seconds
  if (dbAvailable !== null && now - dbAvailableCheckedAt < 30000) {
    return dbAvailable
  }
  
  try { 
    await query('SELECT 1'); 
    dbAvailable = true 
  } catch { 
    dbAvailable = false 
  }
  
  dbAvailableCheckedAt = now
  return dbAvailable
}
```

**Caching:** 30 seconds TTL for availability status

### 7.2 Rate Limiting

#### User-Level Rate Limiting
**Limit:** 20 requests per 24 hours (per IP address)

**Implementation:**
```javascript
async function checkUserLimit(ipAddress) {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Count requests in last 24 hours
  const result = await query(
    `SELECT COUNT(*) as count FROM rate_limits 
     WHERE ip_address = $1 AND created_at > $2`,
    [ipAddress, oneDayAgo]
  )

  const count = parseInt(result.rows[0]?.count || 0)
  
  if (count >= USER_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  // Record this request
  await query(
    `INSERT INTO rate_limits (ip_address, created_at) 
     VALUES ($1, $2)`,
    [ipAddress, now]
  )

  return { allowed: true, remaining: USER_LIMIT - count - 1 }
}
```

**Storage:** `rate_limits` table  
**Cleanup:** No automatic cleanup (grows indefinitely)

#### Global Rate Limiting
**Limit:** 200 requests per hour (system-wide)

**Implementation:**
```javascript
async function checkGlobalLimit() {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const result = await query(
    `SELECT request_count, window_start 
     FROM global_rate_limits 
     WHERE id = 'global' AND window_start > $1`,
    [oneHourAgo]
  )

  if (result.rows.length === 0) {
    // Create new window
    await query(
      `INSERT INTO global_rate_limits 
       (id, request_count, window_start) 
       VALUES ('global', 1, $1)
       ON CONFLICT (id) DO UPDATE 
       SET request_count = 1, window_start = $1`,
      [now]
    )
    return { allowed: true, remaining: GLOBAL_LIMIT - 1 }
  }

  const currentCount = parseInt(result.rows[0].request_count)
  
  if (currentCount >= GLOBAL_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  // Increment counter
  await query(
    `UPDATE global_rate_limits 
     SET request_count = request_count + 1 
     WHERE id = 'global'`
  )

  return { allowed: true, remaining: GLOBAL_LIMIT - currentCount - 1 }
}
```

**Storage:** `global_rate_limits` table (single row)  
**Window:** Sliding 1-hour window

### 7.3 Caching Strategy

#### In-Memory Cache
**Implementation:** Simple Map-based cache

```javascript
const memCache = new Map()

function getCached(key) {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { 
    memCache.delete(key); 
    return null 
  }
  return entry.data
}

function setCache(key, data, ttlMs = 300000) {
  memCache.set(key, { 
    data, 
    expiresAt: Date.now() + ttlMs 
  })
}
```

**Cache Keys:**
- `home-page-data` (5 minutes)
- `movies-trending-{limit}` (5 minutes)
- `tv-trending-{limit}` (5 minutes)
- `tv-korean-{limit}` (5 minutes)
- `tv-turkish-{limit}` (5 minutes)
- `tv-chinese-{limit}` (5 minutes)
- `movies-documentaries-{limit}` (5 minutes)
- `tv-anime-{limit}` (5 minutes)
- `movies-classics-{limit}` (5 minutes)

**TTL (Time To Live):**
- Default: 300,000ms (5 minutes)
- Random endpoints: 60,000ms (1 minute)

**HTTP Cache Headers:**
```javascript
function cacheControl(seconds) {
  return (_req, res, next) => {
    res.setHeader(
      'Cache-Control', 
      `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`
    )
    next()
  }
}
```

**Browser Caching:**
- Trending endpoints: 300 seconds (5 minutes)
- Random endpoints: 60 seconds (1 minute)
- Search endpoints: 60 seconds (1 minute)

**Issues:**
- In-memory cache lost on server restart
- No cache invalidation strategy
- No distributed cache (single server only)
- Cache grows indefinitely (no size limit)

### 7.4 Duplicate Content Handling

#### Current Approach: Upsert with ID Check

**Movies/TV Series:**
```javascript
// Check if content exists by TMDB ID
const checkQuery = `SELECT id FROM ${table} WHERE id = $1`
const checkResult = await pool.query(checkQuery, [tmdbId])
const exists = checkResult.rows.length > 0

if (exists) {
  // UPDATE existing record
  const updateQuery = `UPDATE ${table} SET ... WHERE id = $1`
  await pool.query(updateQuery, values)
} else {
  // INSERT new record
  const insertQuery = `INSERT INTO ${table} (...) VALUES (...)`
  await pool.query(insertQuery, values)
}
```

**Upsert Pattern (Alternative):**
```sql
INSERT INTO movies (id, title, ...) 
VALUES ($1, $2, ...)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  overview = EXCLUDED.overview,
  ...
```

**Duplicate Detection:**
- Primary: By `id` (TMDB ID for movies/tv_series)
- Secondary: By `slug` (UNIQUE constraint)
- No detection by title/content similarity

#### Issues with Current Approach

**Problem 1: Slug Duplicates**
- Multiple entries with same content but different slugs
- Example: `spider-man-2002`, `spider-man-2002-2`, `spider-man-2002-3`
- Caused by cleaning script creating numbered variants

**Problem 2: No Content Deduplication**
- Same movie can exist multiple times if fetched with different metadata
- No fuzzy matching or similarity detection
- Relies solely on TMDB ID matching

**Problem 3: Orphaned Slugs**
- Old slugs remain in database after content deletion
- No cleanup mechanism for unused slugs
- Can cause 404 errors if old URLs cached

**Problem 4: Race Conditions**
- Concurrent requests can create duplicates
- No transaction isolation for slug generation
- Check-then-insert pattern not atomic

### 7.5 TMDB API Error Handling

#### Fetch Errors
```javascript
async function fetchFromTMDB(tmdbId, mediaType) {
  const endpoint = mediaType === 'movie' ? 'movie' : 'tv'
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=ar`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }
  
  return await response.json()
}
```

**Error Types:**
- 401: Invalid API key
- 404: Content not found
- 429: Rate limit exceeded
- 500: TMDB server error

**Current Handling:**
- Throws error immediately
- No retry logic for TMDB API
- No fallback mechanism
- Request marked as 'failed' in database

#### Validation Errors

**Unreleased Content Check:**
```javascript
const releaseDate = tmdbData.release_date || tmdbData.first_air_date
const status = tmdbData.status
const isFuture = releaseDate && new Date(releaseDate) > new Date()
const isNotReleased = mediaType === 'movie' && status && status !== 'Released'

if (isFuture || isNotReleased) {
  return res.status(400).json({
    error: 'عذراً، لا يمكن إضافة محتوى لم يتم إصداره بعد',
    isUnreleased: true
  })
}
```

**Validation Rules:**
- Reject future release dates
- Reject movies with status != 'Released'
- No validation for TV series status

**Missing Validations:**
- No check for adult content
- No check for minimum vote count
- No check for data completeness
- No check for valid poster/backdrop paths

---

## 8. Current Issues & Pain Points

### 8.1 Critical Issues

#### Issue 1: Missing Slugs
**Severity:** 🔴 Critical

**Description:**
- Multiple content items have NULL, empty, or invalid slugs
- Causes "Missing slug for content" errors
- Breaks URL generation and routing

**Examples:**
- `movie:53220` (Rabbit Fire) - Missing slug
- `movie:1290821` (مأوى) - Missing slug
- Arabic titles often result in empty slugs

**Root Cause:**
- Slug generation regex removes Arabic characters
- No fallback for non-Latin titles
- No validation before saving to database

**Impact:**
- Pages crash with error messages
- Content inaccessible via clean URLs
- Poor SEO and user experience

#### Issue 2: Duplicate Content
**Severity:** 🔴 Critical

**Description:**
- Same 20 Arabic movies appearing in ALL sections
- Content repeated across trending, kids, bollywood, etc.

**Root Cause:**
- `/api/db/home` endpoint lacks proper filtering
- No genre-based filtering for sections
- All queries use `ORDER BY popularity DESC`
- Returns same popular movies for every section

**Impact:**
- Poor content diversity
- Confusing user experience
- Wasted database queries

**Example:**
```sql
-- Current (WRONG)
SELECT * FROM movies 
WHERE release_date <= $1 
ORDER BY popularity DESC 
LIMIT 50;

-- Should be (for kids section)
SELECT * FROM movies 
WHERE release_date <= $1 
  AND (genres::text ILIKE '%10751%' OR genres::text ILIKE '%16%')
  AND slug IS NOT NULL
ORDER BY popularity DESC 
LIMIT 50;
```

#### Issue 3: Inconsistent Slug Generation
**Severity:** 🟡 High

**Description:**
- 3 different slug generation implementations
- Different deduplication strategies
- No centralized slug service

**Implementations:**
1. `instant-add.js`: `title` → `title-year` → `title-year-id`
2. `db.js` (save-tmdb): `title-year` → `title-year-2` → `title-year-3`
3. `db.js` (generate): `title-year` → `title-year-2` → `title-year-3`

**Impact:**
- Unpredictable slug formats
- Difficult to maintain
- Potential conflicts

#### Issue 4: No Proper Relations
**Severity:** 🟡 High

**Description:**
- All associations stored as JSONB (denormalized)
- No junction tables for many-to-many relations
- Actors table disconnected from movies/tv_series

**Missing Relations:**
- Movies ↔ Genres (junction table)
- Movies ↔ Actors (junction table)
- TV Series ↔ Genres (junction table)
- TV Series ↔ Actors (junction table)

**Impact:**
- Cannot query "all movies for actor X" efficiently
- Cannot query "all movies in genre Y" efficiently
- Actor updates don't propagate to cast_data
- Duplicate data across records
- No referential integrity

#### Issue 5: No Data Validation
**Severity:** 🟡 High

**Description:**
- No validation for required fields
- No validation for data types
- No validation for JSONB structure
- No validation for image URLs

**Missing Validations:**
- Title/name not empty
- Poster/backdrop paths valid
- Dates in correct format
- Vote average between 0-10
- Popularity >= 0
- JSONB arrays well-formed

**Impact:**
- Corrupt data in database
- Runtime errors in frontend
- Poor data quality

### 8.2 Medium Priority Issues

#### Issue 6: Inefficient Caching
**Severity:** 🟠 Medium

**Description:**
- In-memory cache lost on server restart
- No distributed cache for multi-server deployment
- No cache invalidation strategy
- Cache grows indefinitely (no size limit)

**Current Implementation:**
```javascript
const memCache = new Map()  // Lost on restart
```

**Problems:**
- Single server only (not scalable)
- No TTL enforcement (manual expiry check)
- No LRU eviction policy
- No cache warming on startup

**Impact:**
- Cold start performance issues
- Inconsistent cache across servers
- Memory leaks over time
- Poor scalability

#### Issue 7: No Batch Processing Optimization
**Severity:** 🟠 Medium

**Description:**
- Auto-process worker processes requests one-by-one
- No bulk insert operations
- No transaction batching
- Each request = separate database transaction

**Current Flow:**
```javascript
for (const request of requests) {
  await fetchFromTMDB(request.tmdb_id)
  await insertToDatabase(data)
  await updateRequestStatus(request.id)
}
```

**Should Be:**
```javascript
const batch = await Promise.all(
  requests.map(r => fetchFromTMDB(r.tmdb_id))
)
await bulkInsert(batch)
await bulkUpdateStatus(requests.map(r => r.id))
```

**Impact:**
- Slow batch processing
- High database connection overhead
- Inefficient resource usage

#### Issue 8: No Monitoring or Logging
**Severity:** 🟠 Medium

**Description:**
- No structured logging
- No error tracking (Sentry, etc.)
- No performance monitoring
- No ingestion metrics

**Missing Metrics:**
- Requests processed per hour
- Average processing time
- Error rate by type
- Cache hit/miss ratio
- Database query performance
- TMDB API response times

**Impact:**
- Difficult to debug issues
- No visibility into system health
- Cannot identify bottlenecks
- No alerting for failures

#### Issue 9: Rate Limit Table Cleanup
**Severity:** 🟠 Medium

**Description:**
- `rate_limits` table grows indefinitely
- No automatic cleanup of old records
- No partitioning by date

**Current State:**
```sql
-- No cleanup mechanism
INSERT INTO rate_limits (ip_address, created_at) 
VALUES ($1, $2)
```

**Should Have:**
```sql
-- Periodic cleanup
DELETE FROM rate_limits 
WHERE created_at < NOW() - INTERVAL '30 days'
```

**Impact:**
- Table bloat over time
- Slower queries
- Wasted storage

#### Issue 10: No Content Update Strategy
**Severity:** 🟠 Medium

**Description:**
- Content fetched once and never updated
- No mechanism to refresh stale data
- No tracking of last update time
- Ratings, vote counts, etc. become outdated

**Missing Features:**
- Periodic content refresh
- Update priority based on popularity
- Incremental updates (only changed fields)
- Update scheduling

**Impact:**
- Stale ratings and vote counts
- Missing new cast/crew additions
- Outdated images and videos
- Poor data freshness

### 8.3 Low Priority Issues

#### Issue 11: No Image Optimization
**Severity:** 🟢 Low

**Description:**
- All images fetched at `original` size
- No responsive image sizes
- No WebP conversion
- No lazy loading hints

**Current:**
```javascript
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original'
```

**Should Support:**
- Multiple sizes: `w500`, `w780`, `w1280`, `original`
- Format negotiation: WebP, AVIF
- Responsive srcset generation

**Impact:**
- Slow page loads
- High bandwidth usage
- Poor mobile experience

#### Issue 12: No Search Optimization
**Severity:** 🟢 Low

**Description:**
- Basic trigram search only
- No full-text search
- No search ranking
- No search analytics

**Current:**
```sql
CREATE INDEX idx_movies_title_trgm 
ON movies USING GIN (title gin_trgm_ops);
```

**Missing:**
- Full-text search with weights
- Search result ranking
- Fuzzy matching
- Search suggestions
- Popular searches tracking

**Impact:**
- Poor search relevance
- No search insights
- Limited search capabilities

#### Issue 13: No Content Moderation
**Severity:** 🟢 Low

**Description:**
- No adult content filtering
- No quality thresholds
- No spam detection
- No content review workflow

**Missing Features:**
- Adult content flag enforcement
- Minimum vote count threshold
- Duplicate content detection
- Manual review queue

**Impact:**
- Potential inappropriate content
- Low-quality content in database
- No editorial control

#### Issue 14: No API Versioning
**Severity:** 🟢 Low

**Description:**
- All endpoints at `/api/db/*`
- No version prefix
- Breaking changes affect all clients
- No deprecation strategy

**Current:**
```
/api/db/movies
/api/db/tv
```

**Should Be:**
```
/api/v1/movies
/api/v1/tv
```

**Impact:**
- Difficult to evolve API
- Breaking changes risky
- No backward compatibility

#### Issue 15: No Database Migrations
**Severity:** 🟢 Low

**Description:**
- Schema changes applied manually
- No migration tracking
- No rollback capability
- No version control for schema

**Missing:**
- Migration framework (Flyway, Liquibase)
- Migration history table
- Up/down migration scripts
- Automated migration on deploy

**Impact:**
- Error-prone schema changes
- Difficult to sync environments
- No audit trail for changes

---

## 9. Recommendations for New Pipeline

### 9.1 Architecture Principles

#### Principle 1: Centralized Ingestion Service
**Current:** Multiple entry points with duplicated logic  
**Recommended:** Single ingestion service with queue-based architecture

```
┌─────────────────┐
│  API Gateway    │
│  (Rate Limit)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Message Queue  │
│  (RabbitMQ/SQS) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ingestion Worker│
│  (Scalable)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│  (CockroachDB)  │
└─────────────────┘
```

**Benefits:**
- Single source of truth for ingestion logic
- Horizontal scalability
- Better error handling and retry
- Decoupled components

#### Principle 2: Proper Relational Design
**Current:** Denormalized JSONB everywhere  
**Recommended:** Normalized schema with junction tables

**Proposed Schema:**
```sql
-- Core tables (keep as is)
movies (id, title, slug, ...)
tv_series (id, name, slug, ...)
actors (id, name, slug, ...)
genres (id, name, slug)  -- NEW: Separate table

-- Junction tables (NEW)
movie_genres (movie_id, genre_id)
movie_cast (movie_id, actor_id, character, order)
movie_crew (movie_id, actor_id, job, department)
tv_genres (tv_id, genre_id)
tv_cast (tv_id, actor_id, character, order)
tv_crew (tv_id, actor_id, job, department)

-- Keep JSONB for truly unstructured data
movies.videos JSONB  -- Trailers (external data)
movies.images JSONB  -- Image URLs (external data)
movies.keywords JSONB  -- Tags (low-value relations)
```

**Benefits:**
- Efficient queries: "all movies for actor X"
- Referential integrity
- No duplicate data
- Easy to update actor info globally

#### Principle 3: Centralized Slug Service
**Current:** 3 different implementations  
**Recommended:** Single slug generation service with transliteration

**Slug Service Features:**
```javascript
class SlugService {
  // Generate slug with transliteration
  async generate(title, year, contentType, id) {
    // 1. Transliterate non-Latin characters
    const transliterated = transliterate(title)
    
    // 2. Slugify
    let slug = slugify(transliterated)
    
    // 3. Add year for uniqueness
    slug = `${slug}-${year}`
    
    // 4. Check uniqueness
    if (await this.exists(slug, contentType)) {
      // 5. Add counter if duplicate
      slug = await this.makeUnique(slug, contentType)
    }
    
    return slug
  }
  
  // Transliterate Arabic/special chars
  transliterate(text) {
    // Use library like 'transliteration' or 'speakingurl'
    return transliterate(text, { lang: 'ar' })
  }
  
  // Make slug unique with counter
  async makeUnique(baseSlug, contentType) {
    let counter = 2
    let slug = `${baseSlug}-${counter}`
    
    while (await this.exists(slug, contentType)) {
      counter++
      slug = `${baseSlug}-${counter}`
    }
    
    return slug
  }
}
```

**Example:**
```
Title: "مأوى"
Transliterated: "mawy"
Slug: "mawy-2024"
```

**Benefits:**
- Consistent slug format
- Handles Arabic/special characters
- Single source of truth
- Easy to test and maintain

### 9.2 Data Quality Improvements

#### Validation Layer
**Recommended:** Comprehensive validation before database insert

```javascript
class ContentValidator {
  validateMovie(data) {
    const errors = []
    
    // Required fields
    if (!data.id) errors.push('Missing TMDB ID')
    if (!data.title?.trim()) errors.push('Missing title')
    
    // Data types
    if (data.vote_average < 0 || data.vote_average > 10) {
      errors.push('Invalid vote_average')
    }
    
    // Dates
    if (data.release_date && !isValidDate(data.release_date)) {
      errors.push('Invalid release_date')
    }
    
    // Images
    if (data.poster_path && !isValidUrl(data.poster_path)) {
      errors.push('Invalid poster_path')
    }
    
    // JSONB structure
    if (!Array.isArray(data.genres)) {
      errors.push('genres must be array')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}
```

#### Content Quality Filters
**Recommended:** Filter low-quality content before ingestion

```javascript
class ContentFilter {
  shouldIngest(data) {
    // Minimum vote count
    if (data.vote_count < 10) return false
    
    // Adult content (optional)
    if (data.adult && !config.allowAdult) return false
    
    // Future releases
    if (isFutureRelease(data.release_date)) return false
    
    // Missing critical data
    if (!data.poster_path) return false
    if (!data.overview?.trim()) return false
    
    return true
  }
}
```

### 9.3 Performance Optimizations

#### Distributed Caching
**Recommended:** Redis for shared cache across servers

```javascript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

class CacheService {
  async get(key) {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  }
  
  async set(key, data, ttlSeconds = 300) {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  }
  
  async invalidate(pattern) {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}
```

**Benefits:**
- Shared cache across servers
- Persistent across restarts
- Built-in TTL and eviction
- Pub/sub for cache invalidation

#### Batch Processing
**Recommended:** Bulk operations for better performance

```javascript
class BatchIngestion {
  async processBatch(requests) {
    // 1. Fetch all from TMDB in parallel
    const tmdbData = await Promise.all(
      requests.map(r => this.fetchFromTMDB(r.tmdb_id))
    )
    
    // 2. Validate all
    const validated = tmdbData.filter(d => this.validator.validate(d))
    
    // 3. Bulk insert (single transaction)
    await this.db.transaction(async (trx) => {
      // Insert movies
      await trx('movies').insert(validated).onConflict('id').merge()
      
      // Insert genres (junction table)
      const genreInserts = validated.flatMap(movie => 
        movie.genres.map(g => ({
          movie_id: movie.id,
          genre_id: g.id
        }))
      )
      await trx('movie_genres').insert(genreInserts).onConflict().ignore()
      
      // Insert cast (junction table)
      const castInserts = validated.flatMap(movie =>
        movie.cast.map(c => ({
          movie_id: movie.id,
          actor_id: c.id,
          character: c.character,
          order: c.order
        }))
      )
      await trx('movie_cast').insert(castInserts).onConflict().ignore()
    })
    
    // 4. Bulk update request status
    await this.db('requests')
      .whereIn('id', requests.map(r => r.id))
      .update({ status: 'processed' })
  }
}
```

**Benefits:**
- 10-100x faster than individual inserts
- Reduced database connections
- Atomic operations (all or nothing)

#### Database Indexing Strategy
**Recommended:** Comprehensive indexing for common queries

```sql
-- Existing indexes (keep)
CREATE INDEX idx_movies_popularity ON movies (popularity DESC);
CREATE INDEX idx_movies_vote_average ON movies (vote_average DESC);
CREATE INDEX idx_movies_release_date ON movies (release_date DESC);
CREATE UNIQUE INDEX idx_movies_slug ON movies(slug);

-- New indexes for junction tables
CREATE INDEX idx_movie_genres_movie_id ON movie_genres(movie_id);
CREATE INDEX idx_movie_genres_genre_id ON movie_genres(genre_id);
CREATE INDEX idx_movie_cast_movie_id ON movie_cast(movie_id);
CREATE INDEX idx_movie_cast_actor_id ON movie_cast(actor_id);

-- Composite indexes for common queries
CREATE INDEX idx_movies_lang_pop ON movies(original_language, popularity DESC);
CREATE INDEX idx_movies_date_pop ON movies(release_date DESC, popularity DESC);

-- Full-text search (better than trigram)
CREATE INDEX idx_movies_title_fts ON movies 
USING GIN (to_tsvector('english', title));
```

### 9.4 Monitoring and Observability

#### Structured Logging
**Recommended:** Use structured logging library (Winston, Pino)

```javascript
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

// Usage
logger.info({ 
  event: 'content_ingested',
  tmdb_id: 550,
  media_type: 'movie',
  duration_ms: 1234
})

logger.error({
  event: 'ingestion_failed',
  tmdb_id: 550,
  error: error.message,
  stack: error.stack
})
```

#### Metrics Collection
**Recommended:** Prometheus + Grafana for metrics

```javascript
import { Counter, Histogram, Gauge } from 'prom-client'

const metrics = {
  ingestionsTotal: new Counter({
    name: 'ingestions_total',
    help: 'Total number of content ingestions',
    labelNames: ['media_type', 'status']
  }),
  
  ingestionDuration: new Histogram({
    name: 'ingestion_duration_seconds',
    help: 'Duration of content ingestion',
    labelNames: ['media_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),
  
  queueSize: new Gauge({
    name: 'ingestion_queue_size',
    help: 'Number of pending requests'
  }),
  
  cacheHitRate: new Counter({
    name: 'cache_hits_total',
    help: 'Cache hit/miss counter',
    labelNames: ['result']  // 'hit' or 'miss'
  })
}

// Usage
metrics.ingestionsTotal.inc({ media_type: 'movie', status: 'success' })
metrics.ingestionDuration.observe({ media_type: 'movie' }, 1.234)
```

#### Error Tracking
**Recommended:** Sentry for error monitoring

```javascript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
})

// Usage
try {
  await ingestContent(tmdbId)
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'ingestion',
      media_type: 'movie'
    },
    extra: {
      tmdb_id: tmdbId
    }
  })
  throw error
}
```

### 9.5 Migration Strategy

#### Phase 1: Parallel Run (2-4 weeks)
1. Deploy new pipeline alongside old system
2. Ingest new content through new pipeline
3. Compare results with old pipeline
4. Fix discrepancies

#### Phase 2: Backfill (1-2 weeks)
1. Export existing content from old schema
2. Transform to new schema format
3. Validate all data
4. Import to new schema
5. Verify data integrity

#### Phase 3: Cutover (1 week)
1. Stop old ingestion pipeline
2. Switch all traffic to new pipeline
3. Monitor for issues
4. Keep old system as backup

#### Phase 4: Cleanup (1 week)
1. Remove old code
2. Drop old tables
3. Update documentation
4. Archive old data

### 9.6 Technology Stack Recommendations

#### Message Queue
**Options:**
- **RabbitMQ** - Mature, feature-rich, good for complex routing
- **AWS SQS** - Managed, scalable, pay-per-use
- **Redis Streams** - Simple, fast, good for small-medium scale

**Recommendation:** Start with Redis Streams (simpler), migrate to RabbitMQ if needed

#### Caching
**Options:**
- **Redis** - Industry standard, feature-rich
- **Memcached** - Simpler, faster for basic caching
- **DragonflyDB** - Redis-compatible, better performance

**Recommendation:** Redis (most versatile)

#### Monitoring
**Stack:**
- **Logging:** Pino (fast) or Winston (feature-rich)
- **Metrics:** Prometheus + Grafana
- **Errors:** Sentry
- **APM:** New Relic or Datadog (optional)

#### Database Migrations
**Options:**
- **Flyway** - Java-based, mature
- **Liquibase** - XML/YAML based, enterprise features
- **node-pg-migrate** - Node.js native, simple
- **Knex.js** - JavaScript migrations, query builder

**Recommendation:** node-pg-migrate (Node.js native, simple)

---

## 10. Appendix

### 10.1 Key Files Reference

#### Backend API Files
| File | Purpose | Lines | Key Functions |
|------|---------|-------|---------------|
| `server/api/db.js` | Main CockroachDB API | 1452 | All CRUD operations, search, trending |
| `server/api/instant-add.js` | Real-time user requests | 250 | Rate limiting, instant ingestion |
| `server/api/process-request.js` | Admin queue processing | 180 | Admin auth, queue processing |
| `server/workers/auto-process-requests.js` | Background worker | 150 | Batch processing, cron job |

#### Database Schema Files
| File | Purpose |
|------|---------|
| `scripts/migration/01_create_schema.sql` | Movies & TV series schema |
| `scripts/migration/02_create_games_table.sql` | Games table schema |
| `scripts/migration/03_create_software_table.sql` | Software table schema |
| `scripts/migration/01_create_actors_table.sql` | Actors table schema |

#### Slug Management Files
| File | Purpose |
|------|---------|
| `scripts/clean-slugs-FINAL-CORRECT.sql` | Slug cleaning script |
| `scripts/add-slug-indexes.sql` | Slug index creation |

### 10.2 Environment Variables

```env
# Database
COCKROACHDB_URL=postgresql://user:pass@host:26257/defaultdb

# TMDB API
VITE_TMDB_API_KEY=your_api_key_here

# Supabase (Auth only)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Server
PORT=3001
NODE_ENV=production

# Rate Limits
USER_RATE_LIMIT=20
GLOBAL_RATE_LIMIT=200

# Cache
CACHE_TTL_SECONDS=300
```

### 10.3 Database Connection Strings

#### CockroachDB (Primary Database)
```
postgresql://cinma-db:PASSWORD@prying-squid-23421.j77.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

**Region:** AWS EU Central 1 (Frankfurt)  
**Cluster:** prying-squid-23421  
**SSL:** Required (verify-full)

#### Supabase (Auth Only)
```
https://lhpuwupbhpcqkwqugkhh.supabase.co
```

**Region:** Not specified  
**Project:** lhpuwupbhpcqkwqugkhh

### 10.4 API Endpoints Summary

#### Content Retrieval
```
GET  /api/db/movies              - List movies
GET  /api/db/movies/:id          - Get movie details
GET  /api/db/tv                  - List TV series
GET  /api/db/tv/:id              - Get TV series details
GET  /api/db/games               - List games
GET  /api/db/software            - List software
GET  /api/db/actors              - List actors
GET  /api/db/actors/:id          - Get actor details
```

#### Search & Discovery
```
GET  /api/db/search              - Search all content
GET  /api/db/movies/trending     - Trending movies
GET  /api/db/tv/trending         - Trending TV series
GET  /api/db/movies/random       - Random movies
GET  /api/db/tv/random           - Random TV series
```

#### Specialized Content
```
GET  /api/db/tv/korean           - Korean dramas
GET  /api/db/tv/turkish          - Turkish series
GET  /api/db/tv/chinese          - Chinese series
GET  /api/db/movies/documentaries - Documentary films
GET  /api/db/tv/anime            - Anime series
GET  /api/db/movies/classics     - Classic movies
```

#### Ingestion
```
POST /api/instant-add            - User content request
POST /api/admin/process-request  - Admin queue processing
POST /api/db/save-tmdb           - Save TMDB content
```

#### Utility
```
GET  /api/db/health              - Database health check
POST /api/db/slug/generate       - Generate missing slugs
GET  /api/db/home                - Homepage aggregated data
```

### 10.5 Glossary

**TMDB** - The Movie Database, primary data source for movies and TV series

**Slug** - URL-friendly identifier (e.g., `spider-man-2002`)

**JSONB** - PostgreSQL binary JSON data type, used for nested/unstructured data

**Junction Table** - Table connecting two entities in many-to-many relationship

**Denormalization** - Storing related data together (JSONB) instead of separate tables

**Rate Limiting** - Restricting number of requests per time period

**Upsert** - INSERT or UPDATE if exists (ON CONFLICT DO UPDATE)

**Transliteration** - Converting text from one script to another (e.g., Arabic to Latin)

**TTL** - Time To Live, expiration time for cached data

**Batch Processing** - Processing multiple items together for efficiency

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-02 | Initial comprehensive documentation |

---

**End of Document**

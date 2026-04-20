# Bugfix Requirements Document

## Introduction

هذا المستند يحدد متطلبات إصلاح مجموعة من المشاكل في التطبيق تتعلق بروابط الكاردات، الأخطاء في قاعدة البيانات، وأخطاء TMDB API التي تملأ الـ terminal.

This document defines requirements for fixing a set of application issues related to card links, database errors, and TMDB API errors that spam the terminal.

## Bug Analysis

### Current Behavior (Defect)

#### 1. Card Links - روابط الكاردات

1.1 WHEN a user clicks on a MovieCard THEN the system navigates to the content details page (`/movie/{slug}`) instead of the watch page (`/watch/movie/{slug}`)

1.2 WHEN content has no slug in the database THEN the system generates a slug with the ID appended (e.g., `/watch/movie/the-voice-of-hind-rajab-2025-1480382`) instead of a clean slug

#### 2. TMDB API Errors - أخطاء TMDB

1.3 WHEN TMDB API returns 404 for non-existent content (IDs: 1171145, 1297842, 1159559, 1316092, 680493, 677638, 1167307) THEN the system logs error messages to the terminal creating spam

1.4 WHEN TMDB API requests fail with 404 THEN the system does not suppress these errors silently

#### 3. Database Column Errors - أخطاء أعمدة قاعدة البيانات

1.5 WHEN the `/api/db/home` endpoint queries `origin_country` column THEN the system throws error "column 'origin_country' does not exist"

1.6 WHEN the `/api/db/home` endpoint queries `category` column THEN the system throws error "column 'category' does not exist"

#### 4. Connection Timeout Errors - أخطاء انقطاع الاتصال

1.7 WHEN CockroachDB connection times out during slug resolution THEN the system throws "Connection terminated due to connection timeout" error without retry

### Expected Behavior (Correct)

#### 1. Card Links - روابط الكاردات

2.1 WHEN a user clicks on a MovieCard THEN the system SHALL navigate directly to the watch page (`/watch/movie/{slug}` or `/watch/tv/{slug}/s1/ep1`)

2.2 WHEN content has no slug in the database THEN the system SHALL use only the generated slug without appending the ID (e.g., `/watch/movie/the-voice-of-hind-rajab-2025`)

#### 2. TMDB API Errors - أخطاء TMDB

2.3 WHEN TMDB API returns 404 for non-existent content THEN the system SHALL suppress the error silently without logging to terminal

2.4 WHEN TMDB API requests fail with 404 THEN the system SHALL return null or empty data gracefully without console spam

#### 3. Database Column Errors - أخطاء أعمدة قاعدة البيانات

2.5 WHEN the `/api/db/home` endpoint needs to filter by country THEN the system SHALL use existing columns or remove the filter if column doesn't exist

2.6 WHEN the `/api/db/home` endpoint needs to filter by category THEN the system SHALL use alternative filtering methods or remove the filter if column doesn't exist

#### 4. Connection Timeout Errors - أخطاء انقطاع الاتصال

2.7 WHEN CockroachDB connection times out during slug resolution THEN the system SHALL retry the connection with exponential backoff before failing

### Unchanged Behavior (Regression Prevention)

#### 1. Card Links - روابط الكاردات

3.1 WHEN content has a valid slug in the database THEN the system SHALL CONTINUE TO generate clean URLs without IDs

3.2 WHEN a user navigates to a content details page directly THEN the system SHALL CONTINUE TO display the details page correctly

#### 2. TMDB API Errors - أخطاء TMDB

3.3 WHEN TMDB API returns valid data THEN the system SHALL CONTINUE TO process and display the data correctly

3.4 WHEN TMDB API returns other error codes (500, 429, etc.) THEN the system SHALL CONTINUE TO retry with exponential backoff as currently implemented

#### 3. Database Column Errors - أخطاء أعمدة قاعدة البيانات

3.5 WHEN the `/api/db/home` endpoint queries existing columns THEN the system SHALL CONTINUE TO return correct data

3.6 WHEN other database endpoints query valid columns THEN the system SHALL CONTINUE TO function without errors

#### 4. Connection Timeout Errors - أخطاء انقطاع الاتصال

3.7 WHEN CockroachDB connections succeed on first attempt THEN the system SHALL CONTINUE TO return data without unnecessary retries

3.8 WHEN slug resolution uses cached data THEN the system SHALL CONTINUE TO return cached results without database queries

# Bugfix Requirements Document

## Introduction

This document addresses multiple content display and ingestion issues affecting the Cinema.online platform. The bugs span across Arabic/English language handling in both the ingestion pipeline (TMDB API data fetching) and frontend display logic. These issues impact user experience by showing incorrect language content, missing metadata, and broken functionality for games.

The root causes are:
- Ingestion scripts fetching wrong language translations from TMDB API
- Frontend components not properly displaying genre information
- Actor count limitation preventing full cast display
- TV series title hierarchy not following Arabic-first convention
- Games ingestion pipeline failures

## Bug Analysis

### Current Behavior (Defect)

**1. Arabic Movie Descriptions Display in English**

1.1 WHEN a movie's Arabic description (overview_ar) is fetched during ingestion from TMDB API THEN the system stores English text instead of Arabic text in the overview_ar field for some movies

1.2 WHEN the Watch page renders a movie with incorrect overview_ar data THEN the system displays English description text when Arabic language is selected

**2. Genre Missing in "You Might Also Like" Section**

1.3 WHEN the MovieCard component renders content in the "You Might Also Like" section THEN the system does not display the genre/content type on the card

1.4 WHEN the same MovieCard component renders in other sections (e.g., home page, discovery pages) THEN the system displays the genre correctly

**3. Genre Displays in English on Watch Pages**

1.5 WHEN the Watch page displays genre information THEN the system shows genre names in English instead of Arabic

**4. Actor Count Limited to 5**

1.6 WHEN the ingestion scripts fetch cast data from TMDB API THEN the system limits actor insertion to 5 actors instead of 8

1.7 WHEN the Watch page displays cast information THEN the system shows only 5 actors instead of the intended 8

**5. TV Series Titles Display in Wrong Language Hierarchy**

1.8 WHEN a TV series card is rendered with both Arabic and English titles available THEN the system displays English title as primary and Arabic as secondary (or only English)

1.9 WHEN the user views TV series cards for shows like "The Handmaid's Tale" or "Riverdale" THEN the system shows "The Handmaid's Tale" instead of showing Arabic title first with English subtitle

**6. Games Pages Broken**

1.10 WHEN the games ingestion script (MASTER_INGESTION_QUEUE_GAMES_IGDB.js) runs THEN the system fails to properly ingest game data from IGDB API

1.11 WHEN users navigate to games discovery pages THEN the system displays errors or no content

### Expected Behavior (Correct)

**1. Arabic Movie Descriptions Should Display in Arabic**

2.1 WHEN a movie's Arabic description is fetched during ingestion from TMDB API with language parameter 'ar' THEN the system SHALL store actual Arabic text in the overview_ar field

2.2 WHEN the Watch page renders a movie with correct overview_ar data THEN the system SHALL display Arabic description text when Arabic language is selected

**2. Genre Should Display in "You Might Also Like" Section**

2.3 WHEN the MovieCard component renders content in the "You Might Also Like" section THEN the system SHALL display the genre/content type using the primary_genre field from the database

2.4 WHEN the MovieCard component renders in any section THEN the system SHALL consistently display genre information

**3. Genre Should Display in Arabic on Watch Pages**

2.5 WHEN the Watch page displays genre information THEN the system SHALL show genre names translated to Arabic using the genre translation mapping

**4. Actor Count Should Be 8**

2.6 WHEN the ingestion scripts fetch cast data from TMDB API THEN the system SHALL insert up to 8 actors (top cast members by cast_order)

2.7 WHEN the Watch page displays cast information THEN the system SHALL show up to 8 actors

**5. TV Series Titles Should Display Arabic First**

2.8 WHEN a TV series card is rendered with both Arabic and English titles available THEN the system SHALL display Arabic title (name_ar) as primary and English title (name_en) as secondary subtitle

2.9 WHEN the user views TV series cards THEN the system SHALL show "اسم المسلسل بالعربي" as main title with "English Name" as subtitle below

**6. Games Pages Should Function Correctly**

2.10 WHEN the games ingestion script runs THEN the system SHALL successfully fetch and store game data from IGDB API with proper error handling

2.11 WHEN users navigate to games discovery pages THEN the system SHALL display game content correctly with all metadata (title, poster, genre, platform)

### Unchanged Behavior (Regression Prevention)

**1. Movie Ingestion for Non-Arabic Content**

3.1 WHEN a movie with English as original language is ingested THEN the system SHALL CONTINUE TO fetch and store English overview correctly in overview_en field

3.2 WHEN a movie with original_language other than Arabic is ingested THEN the system SHALL CONTINUE TO use TMDB translations API to get Arabic overview

**2. Genre Display in Other Sections**

3.3 WHEN the MovieCard component renders in sections where genre currently displays correctly THEN the system SHALL CONTINUE TO show genre information without regression

**3. Movie Title Display**

3.4 WHEN movie cards are rendered with Arabic and English titles THEN the system SHALL CONTINUE TO display titles using the existing dual-title logic without changes

**4. Actor Display for Movies**

3.5 WHEN movie cast is displayed on Watch pages THEN the system SHALL CONTINUE TO show actors with profile images, names, and character information

**5. TV Series Ingestion**

3.6 WHEN TV series are ingested from TMDB API THEN the system SHALL CONTINUE TO fetch seasons, episodes, and metadata correctly

3.7 WHEN TV series with Arabic translations are ingested THEN the system SHALL CONTINUE TO store name_ar, name_en, overview_ar, and overview_en fields

**6. Other Content Types**

3.8 WHEN anime, software, or other content types are displayed THEN the system SHALL CONTINUE TO function without regression

3.9 WHEN users interact with watchlist, continue watching, or other user features THEN the system SHALL CONTINUE TO work correctly

# 🎬 TMDB API - دليل الحقول الكامل

## نظرة عامة
هذا الملف يوثق جميع الحقول المتاحة من TMDB API لضمان سحب كل المعلومات الممكنة.

## 🎥 Movies API

### Endpoint: `/movie/{movie_id}`
```
GET https://api.themoviedb.org/3/movie/{movie_id}?api_key={key}&language=ar-SA&append_to_response=credits,videos,keywords,similar,recommendations,release_dates,external_ids
```

### الحقول المتاحة:

#### معلومات أساسية
- `id` - معرف TMDB
- `imdb_id` - معرف IMDB
- `title` - العنوان الأصلي
- `original_title` - العنوان الأصلي باللغة الأصلية
- `tagline` - الشعار
- `overview` - الوصف
- `poster_path` - مسار الصورة الرئيسية
- `backdrop_path` - مسار صورة الخلفية

#### تواريخ وأرقام
- `release_date` - تاريخ الإصدار
- `runtime` - مدة الفيلم بالدقائق
- `budget` - الميزانية
- `revenue` - الإيرادات
- `popularity` - درجة الشعبية
- `vote_average` - متوسط التقييم
- `vote_count` - عدد الأصوات

#### تصنيفات
- `genres` - التصنيفات (Array)
  - `id` - معرف التصنيف
  - `name` - اسم التصنيف
- `adult` - محتوى للبالغين (Boolean)
- `video` - فيديو (Boolean)

#### لغات ودول
- `original_language` - اللغة الأصلية
- `spoken_languages` - اللغات المنطوقة (Array)
  - `iso_639_1` - كود اللغة
  - `name` - اسم اللغة
- `production_countries` - دول الإنتاج (Array)
  - `iso_3166_1` - كود الدولة
  - `name` - اسم الدولة

#### شركات الإنتاج
- `production_companies` - شركات الإنتاج (Array)
  - `id` - معرف الشركة
  - `name` - اسم الشركة
  - `logo_path` - شعار الشركة
  - `origin_country` - دولة الشركة

#### مجموعات
- `belongs_to_collection` - ينتمي لمجموعة
  - `id` - معرف المجموعة
  - `name` - اسم المجموعة
  - `poster_path` - صورة المجموعة
  - `backdrop_path` - خلفية المجموعة

#### الطاقم (append_to_response=credits)
- `credits.cast` - الممثلون (Array)
  - `id` - معرف الممثل
  - `name` - اسم الممثل
  - `character` - اسم الشخصية
  - `profile_path` - صورة الممثل
  - `order` - ترتيب الظهور
  - `cast_id` - معرف الدور
- `credits.crew` - طاقم العمل (Array)
  - `id` - معرف الشخص
  - `name` - الاسم
  - `job` - الوظيفة
  - `department` - القسم
  - `profile_path` - الصورة

#### الفيديوهات (append_to_response=videos)
- `videos.results` - الفيديوهات (Array)
  - `id` - معرف الفيديو
  - `key` - مفتاح YouTube
  - `name` - اسم الفيديو
  - `site` - الموقع (YouTube)
  - `type` - النوع (Trailer, Teaser, etc.)
  - `size` - الجودة (1080, 720, etc.)

#### الكلمات المفتاحية (append_to_response=keywords)
- `keywords.keywords` - الكلمات المفتاحية (Array)
  - `id` - معرف الكلمة
  - `name` - الكلمة المفتاحية

#### محتوى مشابه (append_to_response=similar)
- `similar.results` - أفلام مشابهة (Array)

#### توصيات (append_to_response=recommendations)
- `recommendations.results` - أفلام موصى بها (Array)

#### تصنيفات عمرية (append_to_response=release_dates)
- `release_dates.results` - تواريخ الإصدار (Array)
  - `iso_3166_1` - كود الدولة
  - `release_dates` - التواريخ (Array)
    - `certification` - التصنيف العمري
    - `type` - نوع الإصدار
    - `release_date` - تاريخ الإصدار

#### معرفات خارجية (append_to_response=external_ids)
- `external_ids`
  - `imdb_id` - معرف IMDB
  - `facebook_id` - معرف Facebook
  - `instagram_id` - معرف Instagram
  - `twitter_id` - معرف Twitter


## 📺 TV Series API

### Endpoint: `/tv/{series_id}`
```
GET https://api.themoviedb.org/3/tv/{series_id}?api_key={key}&language=ar-SA&append_to_response=credits,videos,keywords,similar,recommendations,content_ratings,external_ids
```

### الحقول المتاحة:

#### معلومات أساسية
- `id` - معرف TMDB
- `name` - اسم المسلسل
- `original_name` - الاسم الأصلي
- `tagline` - الشعار
- `overview` - الوصف
- `poster_path` - صورة رئيسية
- `backdrop_path` - صورة خلفية

#### تواريخ وحالة
- `first_air_date` - تاريخ أول عرض
- `last_air_date` - تاريخ آخر عرض
- `status` - الحالة (Returning Series, Ended, etc.)
- `type` - النوع (Scripted, Documentary, etc.)
- `in_production` - قيد الإنتاج (Boolean)

#### حلقات ومواسم
- `number_of_seasons` - عدد المواسم
- `number_of_episodes` - عدد الحلقات
- `episode_run_time` - مدة الحلقة (Array)
- `seasons` - المواسم (Array)
  - `id` - معرف الموسم
  - `season_number` - رقم الموسم
  - `name` - اسم الموسم
  - `overview` - وصف الموسم
  - `poster_path` - صورة الموسم
  - `air_date` - تاريخ العرض
  - `episode_count` - عدد الحلقات

#### الحلقة القادمة
- `next_episode_to_air` - الحلقة القادمة
  - `id` - معرف الحلقة
  - `name` - اسم الحلقة
  - `episode_number` - رقم الحلقة
  - `season_number` - رقم الموسم
  - `air_date` - تاريخ العرض
  - `overview` - الوصف
  - `still_path` - صورة الحلقة

#### آخر حلقة
- `last_episode_to_air` - آخر حلقة تم عرضها (نفس الحقول)

#### تقييمات
- `popularity` - الشعبية
- `vote_average` - متوسط التقييم
- `vote_count` - عدد الأصوات

#### تصنيفات
- `genres` - التصنيفات (Array)
- `adult` - محتوى للبالغين

#### لغات ودول
- `original_language` - اللغة الأصلية
- `spoken_languages` - اللغات المنطوقة (Array)
- `production_countries` - دول الإنتاج (Array)
- `origin_country` - دول المنشأ (Array)

#### شركات وشبكات
- `production_companies` - شركات الإنتاج (Array)
- `networks` - الشبكات (Array)
  - `id` - معرف الشبكة
  - `name` - اسم الشبكة
  - `logo_path` - شعار الشبكة
  - `origin_country` - دولة الشبكة

#### المبدعون
- `created_by` - المبدعون (Array)
  - `id` - معرف المبدع
  - `name` - اسم المبدع
  - `profile_path` - صورة المبدع

#### الطاقم (append_to_response=credits)
- `credits.cast` - الممثلون (نفس هيكل الأفلام)
- `credits.crew` - طاقم العمل (نفس هيكل الأفلام)

#### الفيديوهات (append_to_response=videos)
- `videos.results` - الفيديوهات (نفس هيكل الأفلام)

#### الكلمات المفتاحية (append_to_response=keywords)
- `keywords.results` - الكلمات المفتاحية (Array)

#### محتوى مشابه (append_to_response=similar)
- `similar.results` - مسلسلات مشابهة (Array)

#### توصيات (append_to_response=recommendations)
- `recommendations.results` - مسلسلات موصى بها (Array)

#### تصنيفات عمرية (append_to_response=content_ratings)
- `content_ratings.results` - التصنيفات (Array)
  - `iso_3166_1` - كود الدولة
  - `rating` - التصنيف العمري

#### معرفات خارجية (append_to_response=external_ids)
- `external_ids`
  - `imdb_id` - معرف IMDB
  - `tvdb_id` - معرف TVDB
  - `facebook_id` - معرف Facebook
  - `instagram_id` - معرف Instagram
  - `twitter_id` - معرف Twitter

## 📅 Season Details API

### Endpoint: `/tv/{series_id}/season/{season_number}`
```
GET https://api.themoviedb.org/3/tv/{series_id}/season/{season_number}?api_key={key}&language=ar-SA
```

### الحقول المتاحة:
- `id` - معرف الموسم
- `season_number` - رقم الموسم
- `name` - اسم الموسم
- `overview` - وصف الموسم
- `poster_path` - صورة الموسم
- `air_date` - تاريخ العرض
- `episodes` - الحلقات (Array)
  - `id` - معرف الحلقة
  - `episode_number` - رقم الحلقة
  - `name` - اسم الحلقة
  - `overview` - وصف الحلقة
  - `still_path` - صورة الحلقة
  - `air_date` - تاريخ العرض
  - `runtime` - مدة الحلقة
  - `vote_average` - التقييم
  - `vote_count` - عدد الأصوات
  - `crew` - طاقم الحلقة
  - `guest_stars` - ضيوف الحلقة

## 🎭 Person Details API

### Endpoint: `/person/{person_id}`
```
GET https://api.themoviedb.org/3/person/{person_id}?api_key={key}&language=ar-SA&append_to_response=movie_credits,tv_credits,external_ids
```

### الحقول المتاحة:
- `id` - معرف الشخص
- `name` - الاسم
- `biography` - السيرة الذاتية
- `birthday` - تاريخ الميلاد
- `deathday` - تاريخ الوفاة
- `place_of_birth` - مكان الميلاد
- `profile_path` - صورة الشخص
- `known_for_department` - القسم المعروف به
- `popularity` - الشعبية
- `gender` - الجنس (1=أنثى, 2=ذكر)
- `also_known_as` - أسماء أخرى (Array)
- `homepage` - الموقع الشخصي

#### الأعمال (append_to_response=movie_credits,tv_credits)
- `movie_credits.cast` - أفلام كممثل
- `movie_credits.crew` - أفلام كطاقم
- `tv_credits.cast` - مسلسلات كممثل
- `tv_credits.crew` - مسلسلات كطاقم

## 🔍 Search APIs

### Movies Search
```
GET https://api.themoviedb.org/3/search/movie?api_key={key}&query={query}&language=ar-SA&page=1
```

### TV Search
```
GET https://api.themoviedb.org/3/search/tv?api_key={key}&query={query}&language=ar-SA&page=1
```

### Multi Search (أفلام + مسلسلات + أشخاص)
```
GET https://api.themoviedb.org/3/search/multi?api_key={key}&query={query}&language=ar-SA&page=1
```

## 📊 Discovery APIs

### Discover Movies
```
GET https://api.themoviedb.org/3/discover/movie?api_key={key}&language=ar-SA&sort_by=popularity.desc&page=1
```

#### Filters المتاحة:
- `sort_by` - الترتيب (popularity.desc, vote_average.desc, release_date.desc, etc.)
- `with_genres` - التصنيفات (28,12,16)
- `primary_release_year` - سنة الإصدار
- `vote_average.gte` - التقييم الأدنى
- `vote_count.gte` - عدد الأصوات الأدنى
- `with_original_language` - اللغة الأصلية
- `with_runtime.gte` - المدة الأدنى
- `with_runtime.lte` - المدة الأقصى

### Discover TV
```
GET https://api.themoviedb.org/3/discover/tv?api_key={key}&language=ar-SA&sort_by=popularity.desc&page=1
```

## 🏆 Trending API
```
GET https://api.themoviedb.org/3/trending/{media_type}/{time_window}?api_key={key}
```
- `media_type`: all, movie, tv, person
- `time_window`: day, week

## ⭐ Top Rated
```
GET https://api.themoviedb.org/3/movie/top_rated?api_key={key}&language=ar-SA&page=1
GET https://api.themoviedb.org/3/tv/top_rated?api_key={key}&language=ar-SA&page=1
```

## 🔥 Popular
```
GET https://api.themoviedb.org/3/movie/popular?api_key={key}&language=ar-SA&page=1
GET https://api.themoviedb.org/3/tv/popular?api_key={key}&language=ar-SA&page=1
```

## 🆕 Now Playing / On The Air
```
GET https://api.themoviedb.org/3/movie/now_playing?api_key={key}&language=ar-SA&page=1
GET https://api.themoviedb.org/3/tv/on_the_air?api_key={key}&language=ar-SA&page=1
```

## 📝 ملاحظات مهمة

### اللغات المدعومة
- `ar-SA` - العربية (السعودية)
- `ar` - العربية
- `en-US` - الإنجليزية (أمريكا)
- `en` - الإنجليزية

### الصور
- Base URL: `https://image.tmdb.org/t/p/`
- Sizes:
  - Poster: w92, w154, w185, w342, w500, w780, original
  - Backdrop: w300, w780, w1280, original
  - Profile: w45, w185, h632, original
  - Still: w92, w185, w300, original

### Rate Limits
- 40 requests per 10 seconds
- استخدم caching لتقليل الطلبات

### Best Practices
1. استخدم `append_to_response` لتقليل عدد الطلبات
2. احفظ البيانات في قاعدة البيانات
3. حدّث البيانات دورياً (كل أسبوع للمحتوى القديم، يومياً للجديد)
4. استخدم `language=ar-SA` للحصول على الترجمة العربية
5. احفظ `original_language` و `original_title` دائماً

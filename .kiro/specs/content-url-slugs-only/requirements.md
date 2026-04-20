# مستند المتطلبات - روابط المحتوى بالـ Slugs فقط

## المقدمة

هذه الميزة تهدف إلى تحسين بنية الروابط في الموقع بحيث تستخدم slugs (أسماء المحتوى) فقط بدلاً من استخدام IDs كـ fallback. حالياً، عندما لا يكون هناك slug للمحتوى، يتم إضافة الـ ID في نهاية الرابط (مثل `/watch/movie/spider-man-12345`)، مما يجعل الروابط غير نظيفة وغير صديقة لمحركات البحث.

الهدف هو جعل جميع الروابط تستخدم slugs نظيفة فقط (مثل `/watch/movie/spider-man`)، مع ضمان أن جميع المحتوى في قاعدة البيانات يحتوي على slugs صالحة.

## المصطلحات

- **Slug**: نص معرّف فريد مشتق من عنوان المحتوى، يستخدم في الروابط (مثل "spider-man")
- **Content_URL_Generator**: النظام المسؤول عن توليد روابط صفحات التفاصيل
- **Watch_URL_Generator**: النظام المسؤول عن توليد روابط صفحات المشاهدة
- **Database**: قاعدة البيانات التي تحتوي على بيانات المحتوى
- **Legacy_URL**: الروابط القديمة التي تحتوي على ID في النهاية
- **Clean_URL**: الروابط الجديدة التي تحتوي على slug فقط
- **Slug_Generator**: الدالة المسؤولة عن توليد slugs من العناوين
- **URL_Parser**: النظام المسؤول عن تحليل الروابط واستخراج المعلومات منها

## المتطلبات

### المتطلب 1: توليد Slugs للمحتوى الموجود

**قصة المستخدم:** كمطور، أريد أن يكون لكل محتوى في قاعدة البيانات slug صالح، حتى تكون جميع الروابط نظيفة وموحدة.

#### معايير القبول

1. THE Slug_Generator SHALL create unique slugs for all content items that do not have a slug
2. WHEN a content item has a title, THE Slug_Generator SHALL derive the slug from the title using the existing slugify function
3. WHEN multiple content items generate the same slug, THE Slug_Generator SHALL append the year to create uniqueness
4. IF the year is not available, THEN THE Slug_Generator SHALL append a sequential number to ensure uniqueness
5. THE Slug_Generator SHALL preserve existing valid slugs without modification
6. THE Slug_Generator SHALL handle Arabic, English, and CJK characters correctly
7. FOR ALL generated slugs, THE Slug_Generator SHALL validate that the slug matches the pattern: lowercase letters, numbers, hyphens only

### المتطلب 2: تحديث دوال توليد الروابط

**قصة المستخدم:** كمطور، أريد أن تولد دوال الروابط روابط نظيفة تحتوي على slugs فقط، حتى تكون الروابط صديقة لمحركات البحث.

#### معايير القبول

1. THE Content_URL_Generator SHALL generate URLs using only the slug without appending the ID
2. WHEN a content item does not have a slug, THE Content_URL_Generator SHALL throw an error indicating missing slug
3. THE Watch_URL_Generator SHALL generate watch URLs using only the slug without appending the ID
4. WHEN generating a watch URL for a series, THE Watch_URL_Generator SHALL include season and episode numbers in the format `/watch/tv/{slug}/s{season}/ep{episode}`
5. WHEN generating a watch URL for a movie, THE Watch_URL_Generator SHALL use the format `/watch/movie/{slug}`
6. THE Content_URL_Generator SHALL support all media types: movie, tv, series, anime, actor, person, game, software

### المتطلب 3: دعم الروابط القديمة (Legacy URLs)

**قصة المستخدم:** كمستخدم، أريد أن تعمل الروابط القديمة التي حفظتها أو شاركتها، حتى لا تنكسر الروابط الموجودة.

#### معايير القبول

1. WHEN a user accesses a Legacy_URL with ID at the end, THE URL_Parser SHALL extract the ID from the URL
2. THE URL_Parser SHALL query the Database to find the content by ID
3. WHEN the content is found, THE System SHALL redirect to the Clean_URL using HTTP 301 (permanent redirect)
4. THE URL_Parser SHALL detect Legacy_URLs by checking if the last segment after the final hyphen is a numeric ID
5. WHEN the slug in the URL does not match the current slug in the Database, THE System SHALL redirect to the correct Clean_URL
6. IF the content is not found by ID, THEN THE System SHALL return a 404 error

### المتطلب 4: تحليل الروابط في صفحة المشاهدة

**قصة المستخدم:** كمستخدم، أريد أن تعمل صفحة المشاهدة بشكل صحيح عند استخدام slugs، حتى أتمكن من مشاهدة المحتوى بدون مشاكل.

#### معايير القبول

1. WHEN a user accesses a watch page with a slug, THE URL_Parser SHALL attempt to resolve the slug to a content ID
2. THE URL_Parser SHALL first query the Database using the slug
3. IF the Database query fails, THEN THE URL_Parser SHALL search TMDB using the slug text
4. WHEN searching TMDB, THE URL_Parser SHALL extract potential year from the slug (e.g., "spider-man-2024")
5. WHEN a year is found in the slug, THE URL_Parser SHALL prioritize TMDB results matching that year
6. WHEN the content is resolved, THE System SHALL load the watch page with the correct content
7. IF the content cannot be resolved, THEN THE System SHALL display a 404 error page

### المتطلب 5: تحديث مكونات الروابط

**قصة المستخدم:** كمطور، أريد أن تستخدم جميع المكونات في الموقع الدوال المحدثة لتوليد الروابط، حتى تكون جميع الروابط متسقة.

#### معايير القبول

1. THE MovieCard component SHALL use generateContentUrl and generateWatchUrl for all links
2. THE Watch page SHALL use generateWatchUrl when navigating between episodes
3. THE MovieDetails page SHALL use generateContentUrl for navigation
4. WHEN a component generates a link, THE component SHALL pass the complete content object including slug to the URL generator
5. THE System SHALL ensure no component manually constructs URLs with IDs
6. FOR ALL navigation actions, THE System SHALL use the centralized URL generation functions

### المتطلب 6: التحقق من صحة البيانات

**قصة المستخدم:** كمطور، أريد التأكد من أن جميع المحتوى يحتوي على slugs صالحة قبل النشر، حتى لا تحدث أخطاء في الإنتاج.

#### معايير القبول

1. THE System SHALL provide a validation script to check all content for missing or invalid slugs
2. THE validation script SHALL report all content items without slugs
3. THE validation script SHALL report all duplicate slugs
4. THE validation script SHALL report all slugs that do not match the required pattern
5. WHEN validation fails, THE script SHALL provide a detailed report with content IDs and titles
6. THE System SHALL prevent deployment if validation fails

### المتطلب 7: اختبار Round-Trip للروابط

**قصة المستخدم:** كمطور، أريد التأكد من أن توليد الروابط وتحليلها يعمل بشكل صحيح، حتى لا تحدث مشاكل في التنقل.

#### معايير القبول

1. FOR ALL valid content objects with slugs, generating a URL then parsing it SHALL return the same content ID
2. THE System SHALL test round-trip conversion for all media types: movie, tv, game, software
3. THE System SHALL test round-trip conversion for series with season and episode numbers
4. WHEN a URL is generated and then parsed, THE parsed data SHALL match the original content data
5. THE System SHALL test edge cases: Arabic slugs, CJK slugs, slugs with years, slugs with special characters

### المتطلب 8: معالجة الأخطاء

**قصة المستخدم:** كمستخدم، أريد رسائل خطأ واضحة عندما يكون هناك مشكلة في الرابط، حتى أفهم ما حدث.

#### معايير القبول

1. WHEN a slug cannot be resolved, THE System SHALL display a user-friendly 404 page
2. THE 404 page SHALL suggest similar content based on the slug text
3. WHEN a content item is missing a slug during URL generation, THE System SHALL log an error with the content ID
4. THE System SHALL provide different error messages for: missing content, invalid slug format, database errors
5. WHEN an error occurs, THE System SHALL log detailed information for debugging
6. THE System SHALL not expose internal IDs or database structure in error messages to users

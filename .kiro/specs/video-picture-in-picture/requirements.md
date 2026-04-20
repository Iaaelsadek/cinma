# Requirements Document

## Introduction

هذه الوثيقة تحدد متطلبات إضافة خاصية Picture-in-Picture (PiP) الحقيقية لمشغل الفيديو في صفحات المحتوى (أفلام، مسلسلات، أنمي). الخاصية تسمح للمستخدم بتشغيل الفيديو في نافذة عائمة على سطح المكتب أثناء تصفح محتوى آخر.

This document defines requirements for adding real Picture-in-Picture (PiP) functionality to the video player on content pages (movies, TV series, anime). The feature allows users to play videos in a floating desktop window while browsing other content.

## Glossary

- **Video_Player**: مكون ReactPlayer المستخدم لتشغيل الفيديوهات في الموقع / The ReactPlayer component used for playing videos on the site
- **PiP_Window**: النافذة العائمة التي تظهر على سطح المكتب عند تفعيل PiP / The floating window that appears on desktop when PiP is activated
- **PiP_API**: واجهة برمجة المتصفح `document.pictureInPictureEnabled` / Browser API `document.pictureInPictureEnabled`
- **Content_Pages**: صفحات تفاصيل الأفلام والمسلسلات والأنمي / Movie, TV series, and anime detail pages
- **Video_Controls**: أزرار التحكم في المشغل / Player control buttons
- **Native_Video**: فيديو HTML5 مباشر / Direct HTML5 video element
- **YouTube_Video**: فيديو يوتيوب مضمن عبر iframe / YouTube video embedded via iframe
- **Trailer**: الإعلان الرسمي للمحتوى / Official content trailer

## Requirements

### Requirement 1: PiP API Detection and Browser Support

**User Story:** كمستخدم، أريد أن يتحقق النظام من دعم المتصفح لخاصية PiP، حتى أتمكن من استخدام الخاصية فقط إذا كانت متاحة.

As a user, I want the system to detect PiP browser support, so that I can use the feature only when available.

#### Acceptance Criteria

1. WHEN the Video_Player component mounts, THE Video_Player SHALL check if `document.pictureInPictureEnabled` is true
2. IF `document.pictureInPictureEnabled` is false, THEN THE Video_Player SHALL hide the PiP button
3. IF `document.pictureInPictureEnabled` is true, THEN THE Video_Player SHALL display the PiP button in the controls
4. WHEN the browser does not support PiP, THE Video_Player SHALL log a warning message to the console
5. THE Video_Player SHALL check PiP support separately for Native_Video and YouTube_Video sources

### Requirement 2: PiP Button in Video Controls

**User Story:** كمستخدم، أريد رؤية زر PiP في أدوات التحكم بالفيديو، حتى أتمكن من تفعيل الخاصية بسهولة.

As a user, I want to see a PiP button in video controls, so that I can easily activate the feature.

#### Acceptance Criteria

1. THE Video_Player SHALL display a PiP button in the bottom control bar
2. THE PiP button SHALL be positioned between the subtitles button and fullscreen button
3. WHEN PiP is not active, THE PiP button SHALL display a "picture-in-picture" icon
4. WHEN PiP is active, THE PiP button SHALL display a "picture-in-picture exit" icon
5. THE PiP button SHALL show a tooltip with text "صورة داخل صورة" in Arabic and "Picture in Picture" in English
6. WHEN the user hovers over the PiP button, THE button SHALL change color to indicate interactivity
7. THE PiP button SHALL be visible only when Video_Controls are shown

### Requirement 3: PiP Activation for Native Videos

**User Story:** كمستخدم، أريد تفعيل PiP للفيديوهات المباشرة، حتى أتمكن من مشاهدة الفيديو أثناء تصفح محتوى آخر.

As a user, I want to activate PiP for native videos, so that I can watch while browsing other content.

#### Acceptance Criteria

1. WHEN the user clicks the PiP button on a Native_Video, THE Video_Player SHALL call `videoElement.requestPictureInPicture()`
2. WHEN PiP activation succeeds, THE Video_Player SHALL update the PiP button icon to exit mode
3. WHEN PiP activation fails, THE Video_Player SHALL display an error toast message
4. THE error toast SHALL show "فشل تفعيل PiP" in Arabic and "Failed to activate PiP" in English
5. WHEN PiP is activated, THE video SHALL continue playing in the PiP_Window
6. THE Video_Player SHALL preserve playback state (play/pause, volume, current time) when entering PiP

### Requirement 4: PiP Deactivation

**User Story:** كمستخدم، أريد إيقاف PiP والعودة للمشغل العادي، حتى أتمكن من التحكم الكامل بالفيديو.

As a user, I want to exit PiP and return to normal player, so that I can have full control over the video.

#### Acceptance Criteria

1. WHEN the user clicks the PiP exit button in Video_Controls, THE Video_Player SHALL call `document.exitPictureInPicture()`
2. WHEN the user closes the PiP_Window, THE Video_Player SHALL detect the exit event
3. WHEN PiP exits, THE Video_Player SHALL update the PiP button icon to entry mode
4. THE Video_Player SHALL preserve playback state (play/pause, volume, current time) when exiting PiP
5. WHEN PiP exits, THE video SHALL continue playing in the original Video_Player position

### Requirement 5: Keyboard Shortcut for PiP

**User Story:** كمستخدم، أريد اختصار لوحة مفاتيح لتفعيل PiP، حتى أتمكن من استخدام الخاصية بسرعة.

As a user, I want a keyboard shortcut for PiP, so that I can quickly activate the feature.

#### Acceptance Criteria

1. WHEN the user presses the "P" key, THE Video_Player SHALL toggle PiP mode
2. THE keyboard shortcut SHALL work only when the user is not typing in an input field
3. WHEN PiP is inactive and "P" is pressed, THE Video_Player SHALL activate PiP
4. WHEN PiP is active and "P" is pressed, THE Video_Player SHALL deactivate PiP
5. THE Video_Player SHALL prevent default browser behavior for the "P" key during video playback

### Requirement 6: PiP State Management

**User Story:** كمستخدم، أريد أن يحافظ النظام على حالة PiP بشكل صحيح، حتى تعمل الخاصية بسلاسة.

As a user, I want the system to properly manage PiP state, so that the feature works smoothly.

#### Acceptance Criteria

1. THE Video_Player SHALL maintain a boolean state variable `isPiPActive` to track PiP status
2. WHEN PiP is activated, THE Video_Player SHALL set `isPiPActive` to true
3. WHEN PiP is deactivated, THE Video_Player SHALL set `isPiPActive` to false
4. THE Video_Player SHALL listen to `enterpictureinpicture` event on the video element
5. THE Video_Player SHALL listen to `leavepictureinpicture` event on the video element
6. WHEN the component unmounts while PiP is active, THE Video_Player SHALL exit PiP gracefully

### Requirement 7: YouTube Video PiP Handling

**User Story:** كمستخدم، أريد استخدام PiP مع فيديوهات يوتيوب، حتى أتمكن من مشاهدة الإعلانات الرسمية بنفس الطريقة.

As a user, I want to use PiP with YouTube videos, so that I can watch trailers the same way.

#### Acceptance Criteria

1. WHEN the video source is a YouTube_Video, THE Video_Player SHALL check if the iframe supports PiP
2. IF the YouTube iframe does not support PiP, THEN THE Video_Player SHALL hide the PiP button
3. IF the YouTube iframe supports PiP, THEN THE Video_Player SHALL enable the PiP button
4. WHEN PiP is activated on a YouTube_Video, THE Video_Player SHALL attempt to use the iframe's PiP capability
5. IF YouTube PiP fails, THE Video_Player SHALL display a message suggesting the user open the video on YouTube

### Requirement 8: PiP Integration in Content Pages

**User Story:** كمستخدم، أريد استخدام PiP في جميع صفحات المحتوى، حتى أتمكن من مشاهدة الإعلانات أثناء قراءة التفاصيل.

As a user, I want to use PiP on all content pages, so that I can watch trailers while reading details.

#### Acceptance Criteria

1. THE MovieDetails page SHALL support PiP for Trailer videos
2. THE TVSeriesDetails page SHALL support PiP for Trailer videos
3. THE AnimeDetails page SHALL support PiP for Trailer videos
4. WHEN a user navigates away from a Content_Pages while PiP is active, THE PiP_Window SHALL remain open
5. WHEN a user navigates to a different video while PiP is active, THE Video_Player SHALL exit PiP for the previous video

### Requirement 9: Bilingual UI Support

**User Story:** كمستخدم، أريد أن تكون واجهة PiP متاحة بالعربية والإنجليزية، حتى أتمكن من استخدامها بلغتي المفضلة.

As a user, I want the PiP UI to be available in Arabic and English, so that I can use it in my preferred language.

#### Acceptance Criteria

1. THE PiP button tooltip SHALL display "صورة داخل صورة" when the site language is Arabic
2. THE PiP button tooltip SHALL display "Picture in Picture" when the site language is English
3. THE PiP error messages SHALL display in Arabic when the site language is Arabic
4. THE PiP error messages SHALL display in English when the site language is English
5. THE Video_Player SHALL use the `useLang` hook to determine the current language

### Requirement 10: PiP Error Handling

**User Story:** كمستخدم، أريد رسائل خطأ واضحة عند فشل PiP، حتى أفهم المشكلة وكيفية حلها.

As a user, I want clear error messages when PiP fails, so that I understand the issue and how to resolve it.

#### Acceptance Criteria

1. WHEN PiP activation fails due to browser restrictions, THE Video_Player SHALL display "المتصفح لا يدعم PiP" / "Browser does not support PiP"
2. WHEN PiP activation fails due to video element issues, THE Video_Player SHALL display "فشل تفعيل PiP للفيديو" / "Failed to activate PiP for video"
3. WHEN PiP is blocked by browser permissions, THE Video_Player SHALL display "يرجى السماح بـ PiP في إعدادات المتصفح" / "Please allow PiP in browser settings"
4. THE Video_Player SHALL log detailed error information to the console for debugging
5. THE error toast SHALL auto-dismiss after 5 seconds

### Requirement 11: PiP Accessibility

**User Story:** كمستخدم يعتمد على قارئ الشاشة، أريد أن يكون زر PiP قابلاً للوصول، حتى أتمكن من استخدام الخاصية.

As a user who relies on screen readers, I want the PiP button to be accessible, so that I can use the feature.

#### Acceptance Criteria

1. THE PiP button SHALL have an `aria-label` attribute with descriptive text
2. THE `aria-label` SHALL be "تفعيل صورة داخل صورة" / "Activate Picture in Picture" when PiP is inactive
3. THE `aria-label` SHALL be "إيقاف صورة داخل صورة" / "Exit Picture in Picture" when PiP is active
4. THE PiP button SHALL be keyboard navigable using Tab key
5. THE PiP button SHALL be activatable using Enter or Space key
6. WHEN PiP state changes, THE Video_Player SHALL announce the change to screen readers

### Requirement 12: PiP Visual Feedback

**User Story:** كمستخدم، أريد تغذية راجعة بصرية عند تفعيل PiP، حتى أعرف أن الخاصية نشطة.

As a user, I want visual feedback when PiP is activated, so that I know the feature is active.

#### Acceptance Criteria

1. WHEN PiP is activated, THE PiP button SHALL change color to indicate active state
2. THE active PiP button SHALL use the primary theme color (lumen-gold)
3. WHEN PiP is activated, THE Video_Player SHALL display a brief toast notification
4. THE toast notification SHALL show "تم تفعيل PiP" / "PiP activated" for 2 seconds
5. THE PiP button icon SHALL smoothly transition between entry and exit states


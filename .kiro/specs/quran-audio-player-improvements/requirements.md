# Requirements Document

## Introduction

The Quran audio player requires comprehensive improvements to enhance user experience, accessibility, and functionality. Currently, the player has critical usability issues including an invisible close button, aggressive auto-hide behavior, and missing features common in modern audio players. This specification addresses these issues through a phased approach, introducing a 3-state player system (FULL, MINI, HIDDEN) and implementing industry-standard audio player features while maintaining the spiritual and Islamic design aesthetic.

## Glossary

- **Player**: The Quran audio playback component (QuranPlayerBar)
- **Player_Store**: The Zustand state management store for player state (useQuranPlayerStore)
- **Audio_Controller**: The component that manages the HTML5 Audio element and syncs with Player_Store
- **FULL_Mode**: Expanded player view with all controls visible
- **MINI_Mode**: Minimized player bar with essential controls only
- **HIDDEN_Mode**: Player completely hidden from view
- **Media_Session_API**: Browser API for system-level media controls integration
- **Reciter**: A Quran recitation artist whose audio is being played
- **Surah**: A chapter of the Quran (1-114)
- **Track**: A single audio file representing one Surah recited by one Reciter
- **Queue**: An ordered list of Tracks to be played
- **Round_Trip_Property**: A property where parsing then printing then parsing produces an equivalent object

## Requirements

### Requirement 1: Visible Close Button

**User Story:** As a user, I want a clearly visible close button on the player, so that I can easily minimize or close the player when needed.

#### Acceptance Criteria

1. THE Player SHALL display a close button (X icon) that is always visible without requiring hover
2. WHEN the close button is clicked, THE Player SHALL transition to MINI_Mode instead of stopping playback
3. THE close button SHALL have a minimum touch target size of 44x44 pixels for mobile accessibility
4. THE close button SHALL be positioned consistently in the top-right corner for LTR languages and top-left corner for RTL languages
5. THE close button SHALL have sufficient color contrast (minimum 4.5:1 ratio) against its background

### Requirement 2: Three-State Player System

**User Story:** As a user, I want the player to have minimize and expand functionality, so that I can control how much screen space the player occupies.

#### Acceptance Criteria

1. THE Player SHALL support three distinct states: FULL_Mode, MINI_Mode, and HIDDEN_Mode
2. WHEN in FULL_Mode, THE Player SHALL display all controls including volume, playback speed, repeat, shuffle, and queue
3. WHEN in MINI_Mode, THE Player SHALL display only essential controls: play/pause, skip previous, skip next, and track information
4. WHEN in HIDDEN_Mode, THE Player SHALL not be visible on screen
5. THE Player SHALL provide a button to transition from MINI_Mode to FULL_Mode
6. WHEN the close button is clicked in FULL_Mode, THE Player SHALL transition to MINI_Mode
7. WHEN the close button is clicked in MINI_Mode, THE Player SHALL transition to HIDDEN_Mode and stop playback
8. THE Player_Store SHALL persist the current player state (FULL, MINI, or HIDDEN)

### Requirement 3: Persistent Mini Player

**User Story:** As a user, I want the mini player to remain visible while audio is playing, so that I always have access to playback controls.

#### Acceptance Criteria

1. WHEN audio is playing in MINI_Mode, THE Player SHALL remain visible without auto-hiding
2. THE Player SHALL NOT auto-hide after a timeout period when in MINI_Mode
3. WHEN audio is playing in FULL_Mode, THE Player SHALL remain visible without auto-hiding
4. THE Player SHALL only hide when explicitly closed by the user or when no track is loaded
5. WHEN user interaction occurs (mouse move, touch, keyboard), THE Player SHALL remain visible in its current mode

### Requirement 4: Mobile-Optimized Controls

**User Story:** As a mobile user, I want all essential player controls to be accessible on my device, so that I can fully control audio playback.

#### Acceptance Criteria

1. WHEN viewing on mobile devices (screen width < 640px), THE Player SHALL display volume controls
2. THE Player SHALL use touch-friendly button sizes (minimum 44x44 pixels) on mobile devices
3. WHEN in MINI_Mode on mobile, THE Player SHALL display play/pause, skip controls, and track info
4. THE Player SHALL support swipe gestures: swipe down to minimize, swipe up to expand
5. THE Player SHALL prevent accidental touches by maintaining adequate spacing between controls (minimum 8px)

### Requirement 5: Keyboard Navigation

**User Story:** As a user, I want to control the player using keyboard shortcuts, so that I can navigate efficiently without using a mouse.

#### Acceptance Criteria

1. WHEN the Space key is pressed, THE Player SHALL toggle play/pause
2. WHEN the Right Arrow key is pressed, THE Player SHALL skip to the next track
3. WHEN the Left Arrow key is pressed, THE Player SHALL skip to the previous track
4. WHEN the Up Arrow key is pressed, THE Player SHALL increase volume by 10%
5. WHEN the Down Arrow key is pressed, THE Player SHALL decrease volume by 10%
6. WHEN the M key is pressed, THE Player SHALL toggle mute
7. WHEN the F key is pressed, THE Player SHALL toggle between FULL_Mode and MINI_Mode
8. WHEN the Escape key is pressed in FULL_Mode, THE Player SHALL transition to MINI_Mode
9. THE Player SHALL prevent keyboard shortcuts from triggering when user is typing in an input field
10. THE Player SHALL display a keyboard shortcuts help overlay when the ? key is pressed

### Requirement 6: Media Session API Integration

**User Story:** As a user, I want the player to integrate with my device's system media controls, so that I can control playback from my keyboard, lock screen, or notification center.

#### Acceptance Criteria

1. WHEN a track is playing, THE Player SHALL register metadata with the Media_Session_API including title, artist (Reciter), and artwork
2. WHEN system play/pause controls are used, THE Player SHALL respond by toggling playback
3. WHEN system next track controls are used, THE Player SHALL skip to the next Surah
4. WHEN system previous track controls are used, THE Player SHALL skip to the previous Surah
5. THE Player SHALL update Media_Session_API playback position in real-time
6. WHEN a track changes, THE Player SHALL update Media_Session_API metadata immediately
7. IF Media_Session_API is not supported by the browser, THEN THE Player SHALL function normally without system integration

### Requirement 7: Repeat Modes

**User Story:** As a user, I want to repeat tracks or the entire queue, so that I can listen to my favorite Surahs continuously.

#### Acceptance Criteria

1. THE Player SHALL support three repeat modes: OFF, REPEAT_ONE, and REPEAT_ALL
2. WHEN repeat mode is OFF and a track ends, THE Player SHALL play the next track in the queue or stop if no next track exists
3. WHEN repeat mode is REPEAT_ONE and a track ends, THE Player SHALL restart the same track
4. WHEN repeat mode is REPEAT_ALL and the last track in the queue ends, THE Player SHALL restart from the first track
5. THE Player SHALL display a repeat button that cycles through repeat modes when clicked
6. THE Player SHALL visually indicate the current repeat mode with distinct icons
7. THE Player_Store SHALL persist the repeat mode preference

### Requirement 8: Shuffle Mode

**User Story:** As a user, I want to shuffle the playback order, so that I can listen to Surahs in a randomized sequence.

#### Acceptance Criteria

1. THE Player SHALL support shuffle mode that can be toggled on or off
2. WHEN shuffle mode is enabled and skip next is triggered, THE Player SHALL play a random unplayed track from the available Surahs
3. WHEN shuffle mode is enabled, THE Player SHALL maintain a shuffle history to avoid repeating tracks until all have been played
4. WHEN shuffle mode is disabled, THE Player SHALL return to sequential playback order
5. THE Player SHALL display a shuffle button that toggles shuffle mode when clicked
6. THE Player SHALL visually indicate when shuffle mode is active
7. THE Player_Store SHALL persist the shuffle mode preference

### Requirement 9: Playback Speed Control

**User Story:** As a user, I want to adjust playback speed, so that I can listen at a pace that suits my learning or memorization needs.

#### Acceptance Criteria

1. THE Player SHALL support playback speeds from 0.5x to 2.0x in 0.25x increments
2. WHEN playback speed is changed, THE Audio_Controller SHALL update the audio element playback rate immediately
3. THE Player SHALL display the current playback speed
4. THE Player SHALL provide a control to adjust playback speed (dropdown or slider)
5. WHEN playback speed is set to 1.0x, THE Player SHALL indicate this as "Normal" speed
6. THE Player_Store SHALL persist the playback speed preference
7. THE Player SHALL maintain pitch when playback speed is changed (no chipmunk effect)

### Requirement 10: Queue Management

**User Story:** As a user, I want to view and manage the playback queue, so that I can see what will play next and reorder tracks.

#### Acceptance Criteria

1. THE Player SHALL maintain a queue of tracks to be played
2. WHEN in FULL_Mode, THE Player SHALL display a queue view showing all upcoming tracks
3. THE Player SHALL allow users to reorder tracks in the queue via drag and drop
4. THE Player SHALL allow users to remove tracks from the queue
5. WHEN a Surah is selected for playback, THE Player SHALL add it to the queue
6. THE Player SHALL highlight the currently playing track in the queue view
7. THE Player SHALL display queue position (e.g., "Track 3 of 10")
8. THE Player_Store SHALL persist the queue state

### Requirement 11: Improved Auto-Hide Logic

**User Story:** As a user, I want the player to intelligently manage its visibility, so that it doesn't obstruct content but remains accessible when needed.

#### Acceptance Criteria

1. WHEN in FULL_Mode and no user interaction occurs for 10 seconds, THE Player SHALL reduce opacity to 50% but remain visible
2. WHEN in MINI_Mode, THE Player SHALL never auto-hide while audio is playing
3. WHEN user hovers over the Player in reduced opacity state, THE Player SHALL return to full opacity immediately
4. WHEN audio is paused for more than 30 seconds, THE Player SHALL transition to MINI_Mode automatically
5. THE Player SHALL NOT auto-hide during the first 10 seconds after a track starts playing

### Requirement 12: Accessibility Compliance

**User Story:** As a user with disabilities, I want the player to be fully accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. THE Player SHALL provide ARIA labels for all interactive controls
2. THE Player SHALL support keyboard navigation for all functionality
3. THE Player SHALL maintain focus indicators that meet WCAG 2.1 Level AA standards
4. THE Player SHALL announce state changes (play, pause, track change) to screen readers
5. THE Player SHALL provide text alternatives for all icons and visual indicators
6. THE Player SHALL support high contrast mode
7. THE Player SHALL allow users to navigate between controls using Tab and Shift+Tab keys
8. THE Player SHALL ensure all interactive elements have a minimum touch target size of 44x44 pixels

### Requirement 13: RTL Language Support

**User Story:** As an Arabic-speaking user, I want the player to properly support right-to-left layout, so that the interface feels natural in my language.

#### Acceptance Criteria

1. WHEN the language is set to Arabic, THE Player SHALL mirror its layout for RTL display
2. THE Player SHALL position the close button in the top-left corner for RTL languages
3. THE Player SHALL reverse the order of skip previous and skip next buttons for RTL languages
4. THE Player SHALL display the progress bar filling from right to left in RTL mode
5. THE Player SHALL align text content to the right in RTL mode
6. THE Player SHALL maintain proper spacing and alignment in both LTR and RTL modes

### Requirement 14: Sleep Timer

**User Story:** As a user, I want to set a sleep timer, so that playback automatically stops after a specified duration.

#### Acceptance Criteria

1. THE Player SHALL provide a sleep timer feature with preset durations: 15, 30, 45, 60, 90, and 120 minutes
2. WHEN a sleep timer is set, THE Player SHALL display the remaining time
3. WHEN the sleep timer expires, THE Player SHALL fade out audio over 5 seconds and then stop playback
4. THE Player SHALL allow users to cancel an active sleep timer
5. THE Player SHALL allow users to extend an active sleep timer
6. WHEN the sleep timer has 1 minute remaining, THE Player SHALL display a notification
7. THE Player_Store SHALL track the active sleep timer state

### Requirement 15: Error Handling and Recovery

**User Story:** As a user, I want the player to handle errors gracefully, so that playback issues don't disrupt my experience.

#### Acceptance Criteria

1. WHEN an audio file fails to load, THE Player SHALL display a user-friendly error message
2. IF an audio file fails to load, THEN THE Player SHALL automatically attempt to skip to the next track after 3 seconds
3. WHEN a network error occurs during playback, THE Player SHALL attempt to resume playback when connection is restored
4. THE Player SHALL log all errors to the Player_Store for debugging purposes
5. WHEN an error occurs, THE Player SHALL provide a "Retry" button to attempt loading the track again
6. THE Player SHALL display loading state while audio is buffering
7. IF audio fails to load after 3 retry attempts, THEN THE Player SHALL skip to the next track and notify the user

### Requirement 16: Performance Optimization

**User Story:** As a user, I want the player to perform smoothly, so that it doesn't impact the overall application performance.

#### Acceptance Criteria

1. THE Player SHALL update the progress bar at most once per second to minimize re-renders
2. THE Player SHALL debounce volume slider changes to prevent excessive updates
3. THE Player SHALL use React.memo or similar optimization for child components that don't need frequent updates
4. THE Player SHALL lazy load the queue view component until it's needed
5. THE Player SHALL preload the next track in the queue when the current track is 80% complete
6. THE Player SHALL clean up event listeners and timers when unmounted
7. THE Player SHALL use requestAnimationFrame for smooth animations

### Requirement 17: Visual Feedback and Animations

**User Story:** As a user, I want clear visual feedback for my interactions, so that I understand the player's state and my actions.

#### Acceptance Criteria

1. WHEN a button is clicked, THE Player SHALL provide visual feedback (scale, color change, or ripple effect)
2. WHEN transitioning between player modes, THE Player SHALL animate smoothly over 300ms
3. WHEN a track changes, THE Player SHALL animate the artwork transition
4. WHEN playback starts or stops, THE Player SHALL animate the play/pause button
5. THE Player SHALL display a loading spinner when audio is buffering
6. WHEN volume changes, THE Player SHALL briefly display the volume level as a percentage
7. THE Player SHALL use the spiritual/Islamic design aesthetic with amber/gold accent colors

### Requirement 18: State Persistence

**User Story:** As a user, I want my player preferences to be remembered, so that I don't have to reconfigure settings each time.

#### Acceptance Criteria

1. THE Player_Store SHALL persist volume level to localStorage
2. THE Player_Store SHALL persist playback speed to localStorage
3. THE Player_Store SHALL persist repeat mode to localStorage
4. THE Player_Store SHALL persist shuffle mode to localStorage
5. THE Player_Store SHALL persist player mode (FULL, MINI, HIDDEN) to localStorage
6. WHEN the application loads, THE Player SHALL restore all persisted preferences
7. THE Player SHALL NOT persist the current track or playback position (fresh start on reload)

### Requirement 19: Track Information Display

**User Story:** As a user, I want to see detailed information about the current track, so that I know what I'm listening to.

#### Acceptance Criteria

1. THE Player SHALL display the Surah name in both Arabic and English
2. THE Player SHALL display the Reciter name
3. THE Player SHALL display the Surah number (1-114)
4. THE Player SHALL display the Surah type (Meccan or Medinan)
5. WHEN in FULL_Mode, THE Player SHALL display the number of verses in the current Surah
6. THE Player SHALL display the Reciter's image or a fallback nature image
7. THE Player SHALL display current playback time and total duration

### Requirement 20: Configuration Parser and Validator

**User Story:** As a developer, I want to parse and validate player configuration, so that settings are correctly loaded and applied.

#### Acceptance Criteria

1. WHEN player configuration is loaded from localStorage, THE Configuration_Parser SHALL parse it into a PlayerConfig object
2. WHEN invalid configuration is encountered, THE Configuration_Parser SHALL return a descriptive error with the field name and reason
3. THE Configuration_Validator SHALL validate that volume is between 0 and 1
4. THE Configuration_Validator SHALL validate that playback speed is between 0.5 and 2.0
5. THE Configuration_Validator SHALL validate that repeat mode is one of: OFF, REPEAT_ONE, REPEAT_ALL
6. THE Configuration_Validator SHALL validate that player mode is one of: FULL, MINI, HIDDEN
7. THE Pretty_Printer SHALL format PlayerConfig objects back into valid JSON configuration
8. FOR ALL valid PlayerConfig objects, parsing then printing then parsing SHALL produce an equivalent object (round-trip property)

## Implementation Phases

### Phase 1 (Critical - Must Have)
- Requirement 1: Visible Close Button
- Requirement 2: Three-State Player System
- Requirement 3: Persistent Mini Player
- Requirement 4: Mobile-Optimized Controls
- Requirement 5: Keyboard Navigation
- Requirement 12: Accessibility Compliance
- Requirement 13: RTL Language Support
- Requirement 15: Error Handling and Recovery

### Phase 2 (Important - Should Have)
- Requirement 6: Media Session API Integration
- Requirement 7: Repeat Modes
- Requirement 8: Shuffle Mode
- Requirement 9: Playback Speed Control
- Requirement 11: Improved Auto-Hide Logic
- Requirement 16: Performance Optimization
- Requirement 17: Visual Feedback and Animations
- Requirement 18: State Persistence
- Requirement 20: Configuration Parser and Validator

### Phase 3 (Nice to Have - Could Have)
- Requirement 10: Queue Management
- Requirement 14: Sleep Timer
- Requirement 19: Track Information Display (Enhanced)

## Technical Constraints

1. Must maintain spiritual/Islamic design aesthetic with amber/gold accent colors
2. Must support both RTL (Arabic) and LTR (English) layouts
3. Must work on mobile (iOS/Android) and desktop (Chrome, Firefox, Safari, Edge)
4. Must not break existing functionality in QuranPlayerBar, useQuranPlayerStore, or useQuranAudio
5. Must follow React best practices and use TypeScript for type safety
6. Must follow WCAG 2.1 Level AA accessibility standards
7. Must use Framer Motion for animations to maintain consistency with existing codebase
8. Must use Zustand for state management to maintain consistency with existing architecture
9. Must optimize for performance to avoid impacting overall application responsiveness
10. Must handle network errors gracefully for users with unstable connections

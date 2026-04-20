# Implementation Plan: Quran Audio Player Improvements

## Overview

This implementation plan transforms the Quran audio player from a basic playback component into a comprehensive, accessible, and feature-rich audio player. The implementation follows a phased approach aligned with the requirements document, starting with critical usability fixes and progressing to advanced features.

The plan addresses 20 requirements across 3 phases, implementing a 3-state player system (FULL, MINI, HIDDEN), advanced playback features (repeat, shuffle, speed control, queue management, sleep timer), full accessibility compliance, RTL support, and system-level media integration.

## Implementation Strategy

- **Phase 1**: Critical usability and accessibility fixes (Requirements 1-5, 12-13, 15)
- **Phase 2**: Advanced features and optimizations (Requirements 6-9, 11, 16-18, 20)
- **Phase 3**: Enhanced features (Requirements 10, 14, 19)

Each task builds incrementally, ensuring the player remains functional throughout development. Testing tasks are marked as optional with `*` to allow for faster MVP delivery while maintaining quality standards.

---

## Tasks

### Phase 1: Critical Usability and Accessibility (Requirements 1-5, 12-13, 15)

- [x] 1. Set up enhanced state management and type definitions
  - [x] 1.1 Create enhanced TypeScript types and enums
    - Create `src/types/quran-player.ts` with PlayerMode, RepeatMode, QuranTrack, SleepTimerState, PlayerConfig types
    - Define all enums (PlayerMode: FULL/MINI/HIDDEN, RepeatMode: OFF/REPEAT_ONE/REPEAT_ALL)
    - Add enhanced QuranTrack type with surahNumber, surahType, ayahCount, arabicName, englishName
    - _Requirements: 2.1, 7.1, 8.1, 9.1, 14.7, 20.1_
  
  - [ ]* 1.2 Write property test for type definitions
    - **Property 1: Type safety for PlayerMode enum**
    - **Validates: Requirements 2.1**
    - Test that PlayerMode only accepts FULL, MINI, or HIDDEN values
    - Test that invalid values are rejected at compile time

- [x] 2. Enhance Zustand store with new state and actions
  - [x] 2.1 Add new state fields to useQuranPlayerStore
    - Add playerMode: PlayerMode (default: HIDDEN)
    - Add playbackSpeed: number (default: 1.0)
    - Add repeatMode: RepeatMode (default: OFF)
    - Add shuffleMode: boolean (default: false)
    - Add shuffleHistory: string[] (default: [])
    - Add queue: QuranTrack[] (default: [])
    - Add currentQueueIndex: number (default: 0)
    - Add sleepTimer: SleepTimerState | null (default: null)
    - Add showQueue: boolean (default: false)
    - Add showKeyboardHelp: boolean (default: false)
    - Add opacity: number (default: 1.0)
    - _Requirements: 2.8, 7.7, 8.7, 9.6, 10.8, 11.1, 14.7, 18.5_
  
  - [x] 2.2 Implement player mode actions
    - Implement setPlayerMode(mode: PlayerMode) action
    - Add logic to stop playback when transitioning to HIDDEN mode
    - Add logic to maintain playback when transitioning between FULL and MINI
    - _Requirements: 2.6, 2.7, 2.8_
  
  - [x] 2.3 Implement playback control actions
    - Implement setPlaybackSpeed(speed: number) action with validation (0.5-2.0)
    - Implement setRepeatMode(mode: RepeatMode) action
    - Implement setShuffleMode(enabled: boolean) action
    - Implement skipNext() with repeat/shuffle logic
    - Implement skipPrev() with history tracking
    - _Requirements: 7.1, 7.5, 8.1, 8.5, 9.1, 9.2_
  
  - [x] 2.4 Implement queue management actions
    - Implement addToQueue(track: QuranTrack) action
    - Implement removeFromQueue(index: number) action
    - Implement reorderQueue(fromIndex: number, toIndex: number) action
    - Implement clearQueue() action
    - _Requirements: 10.1, 10.3, 10.4, 10.5_
  
  - [x] 2.5 Implement sleep timer actions
    - Implement setSleepTimer(minutes: number | null) action
    - Implement extendSleepTimer(minutes: number) action
    - Implement cancelSleepTimer() action
    - _Requirements: 14.1, 14.4, 14.5_
  
  - [x] 2.6 Implement UI state actions
    - Implement toggleQueue() action
    - Implement toggleKeyboardHelp() action
    - Implement setOpacity(opacity: number) action
    - _Requirements: 5.10, 10.2, 11.1_
  
  - [ ]* 2.7 Write unit tests for store actions
    - Test setPlayerMode transitions (FULL→MINI→HIDDEN)
    - Test playback stops when transitioning to HIDDEN
    - Test repeat mode cycling
    - Test shuffle mode toggle and history tracking
    - Test queue operations (add, remove, reorder)
    - _Requirements: 2.1-2.8, 7.1-7.7, 8.1-8.7, 10.1-10.8_

- [x] 3. Checkpoint - Verify store implementation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement configuration persistence
  - [x] 4.1 Create configuration parser and validator
    - Create `src/lib/quran-player-config.ts` with parseConfig, validateConfig, prettyPrintConfig functions
    - Implement validation for volume (0-1), playbackSpeed (0.5-2.0), repeatMode, playerMode
    - Implement error handling with descriptive error messages
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_
  
  - [ ]* 4.2 Write property test for configuration round-trip
    - **Property 2: Round-trip consistency**
    - **Validates: Requirements 20.8**
    - Test that parseConfig(prettyPrintConfig(config)) produces equivalent object
    - Use fast-check to generate random valid configurations
  
  - [x] 4.3 Implement loadConfig and saveConfig actions in store
    - Implement loadConfig() to read from localStorage and parse
    - Implement saveConfig() to serialize and write to localStorage
    - Add error handling for corrupted localStorage data
    - Restore defaults if config is invalid
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_
  
  - [ ]* 4.4 Write unit tests for configuration persistence
    - Test loadConfig with valid configuration
    - Test loadConfig with invalid configuration (should use defaults)
    - Test saveConfig writes correct format
    - Test error handling for corrupted data
    - _Requirements: 18.1-18.7, 20.1-20.8_

- [x] 5. Enhance useQuranAudio hook with advanced features
  - [x] 5.1 Implement playback speed control
    - Update audio element playbackRate when playbackSpeed changes
    - Set preservesPitch = true to prevent chipmunk effect
    - _Requirements: 9.2, 9.7_
  
  - [x] 5.2 Implement skip logic with repeat and shuffle modes
    - Implement handleTrackEnd() with repeat mode logic
    - Implement playRandomTrack() for shuffle mode
    - Implement playNextInSequence() for normal mode
    - Update shuffleHistory to avoid repeating tracks
    - _Requirements: 7.2, 7.3, 7.4, 8.2, 8.3_
  
  - [x] 5.3 Implement next track preloading
    - Preload next track when current track reaches 80% completion
    - Handle preloading for both sequential and shuffle modes
    - _Requirements: 16.5_
  
  - [x] 5.4 Implement error handling and recovery
    - Display user-friendly error messages on load failure
    - Implement automatic skip to next track after 3 seconds on error
    - Implement retry logic with 3 attempts before skipping
    - Implement network error recovery when connection restored
    - Add loading state display while buffering
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
  
  - [x] 5.5 Implement sleep timer countdown and fade-out
    - Add interval timer to check sleep timer state
    - Implement 5-second fade-out when timer expires
    - Display notification when 1 minute remains
    - Stop playback after fade-out completes
    - _Requirements: 14.3, 14.6_
  
  - [ ]* 5.6 Write unit tests for useQuranAudio hook
    - Test playback speed changes
    - Test repeat mode behavior (OFF, REPEAT_ONE, REPEAT_ALL)
    - Test shuffle mode with history tracking
    - Test error handling and retry logic
    - Test sleep timer countdown and fade-out
    - _Requirements: 7.2-7.4, 8.2-8.3, 9.2, 14.3, 14.6, 15.1-15.7_

- [x] 6. Checkpoint - Verify audio controller implementation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create reusable UI components
  - [x] 7.1 Create ProgressBar component
    - Create `src/components/features/quran/ProgressBar.tsx`
    - Implement seekable progress bar with current time and duration display
    - Support both 'full' and 'mini' variants
    - Implement RTL support (fill from right to left in RTL mode)
    - Add ARIA labels for accessibility
    - Add keyboard support (arrow keys to seek)
    - _Requirements: 4.3, 5.3, 13.4_
  
  - [x] 7.2 Create VolumeControl component
    - Create `src/components/features/quran/VolumeControl.tsx`
    - Implement volume slider with mute toggle
    - Display volume percentage on change
    - Add ARIA labels and keyboard support
    - Ensure minimum 44x44px touch target
    - _Requirements: 4.1, 4.2, 5.4, 5.5, 12.8_
  
  - [x] 7.3 Create SpeedControl component
    - Create `src/components/features/quran/SpeedControl.tsx`
    - Implement dropdown with speeds from 0.5x to 2.0x in 0.25x increments
    - Display "Normal" for 1.0x speed
    - Add ARIA labels and keyboard navigation
    - _Requirements: 9.1, 9.3, 9.4, 9.5_
  
  - [ ]* 7.4 Write unit tests for UI components
    - Test ProgressBar seek functionality
    - Test ProgressBar RTL mode
    - Test VolumeControl slider and mute toggle
    - Test SpeedControl dropdown options
    - _Requirements: 4.1-4.5, 5.3-5.5, 9.1-9.5, 13.4_

- [x] 8. Implement MiniPlayer component
  - [x] 8.1 Create MiniPlayer component structure
    - Create `src/components/features/quran/MiniPlayer.tsx`
    - Implement compact layout with artwork, track info, and essential controls
    - Add thin progress bar at top edge
    - Position expand and close buttons
    - _Requirements: 2.3, 3.1, 3.2_
  
  - [x] 8.2 Implement MiniPlayer controls and interactions
    - Add play/pause, skip previous, skip next buttons
    - Add expand button to transition to FULL mode
    - Add close button to transition to HIDDEN mode and stop playback
    - Ensure all buttons have minimum 44x44px touch targets
    - Add ARIA labels for all controls
    - _Requirements: 2.3, 2.6, 2.7, 4.2, 4.3, 12.1, 12.8_
  
  - [x] 8.3 Implement MiniPlayer RTL support
    - Mirror layout for RTL languages
    - Position close button in top-left for RTL
    - Reverse skip button order for RTL
    - Align text to the right in RTL mode
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6_
  
  - [x] 8.4 Add MiniPlayer animations and visual feedback
    - Implement smooth transitions for button clicks
    - Add loading spinner for buffering state
    - Animate play/pause button state changes
    - Use amber/gold accent colors for spiritual aesthetic
    - _Requirements: 17.1, 17.4, 17.5, 17.7_
  
  - [ ]* 8.5 Write unit tests for MiniPlayer
    - Test expand button transitions to FULL mode
    - Test close button transitions to HIDDEN and stops playback
    - Test RTL layout mirroring
    - Test accessibility (ARIA labels, keyboard navigation)
    - _Requirements: 2.3, 2.6, 2.7, 3.1-3.2, 4.2-4.3, 12.1-12.8, 13.1-13.6_

- [x] 9. Implement FullPlayer component
  - [x] 9.1 Create FullPlayer component structure
    - Create `src/components/features/quran/FullPlayer.tsx`
    - Implement expanded layout with large artwork, track info, and all controls
    - Add close button in top-right (LTR) or top-left (RTL)
    - Ensure close button is always visible without hover
    - _Requirements: 1.1, 1.4, 2.2_
  
  - [x] 9.2 Implement FullPlayer track information display
    - Display Surah name in Arabic and English
    - Display Reciter name
    - Display Surah number (1-114)
    - Display Surah type (Meccan/Medinan)
    - Display number of verses
    - Display Reciter image or fallback
    - Display current time and total duration
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_
  
  - [x] 9.3 Implement FullPlayer playback controls
    - Add play/pause, skip previous, skip next buttons
    - Add repeat mode button (cycles through OFF/REPEAT_ONE/REPEAT_ALL)
    - Add shuffle mode toggle button
    - Display visual indicators for active repeat/shuffle modes
    - Integrate ProgressBar, VolumeControl, and SpeedControl components
    - _Requirements: 7.5, 7.6, 8.5, 8.6, 9.3, 9.4_
  
  - [x] 9.4 Implement FullPlayer close button functionality
    - Add close button with minimum 44x44px touch target
    - Ensure 4.5:1 color contrast ratio
    - Transition to MINI mode on click (not HIDDEN)
    - Add ARIA label for accessibility
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.6_
  
  - [x] 9.5 Implement FullPlayer RTL support
    - Mirror layout for RTL languages
    - Position close button in top-left for RTL
    - Reverse skip button order for RTL
    - Align text to the right in RTL mode
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6_
  
  - [x] 9.6 Add FullPlayer animations and visual feedback
    - Implement spinning vinyl effect for artwork when playing
    - Animate transitions between tracks
    - Add smooth button click feedback
    - Display loading spinner when buffering
    - Use amber/gold accent colors
    - _Requirements: 17.1, 17.3, 17.4, 17.5, 17.7_
  
  - [ ]* 9.7 Write unit tests for FullPlayer
    - Test close button transitions to MINI mode
    - Test all playback controls
    - Test repeat and shuffle mode toggles
    - Test RTL layout mirroring
    - Test accessibility compliance
    - _Requirements: 1.1-1.5, 2.2, 2.6, 7.5-7.6, 8.5-8.6, 9.3-9.4, 12.1-12.8, 13.1-13.6, 19.1-19.7_

- [x] 10. Checkpoint - Verify player components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement KeyboardShortcutsHandler component
  - [x] 11.1 Create KeyboardShortcutsHandler component
    - Create `src/components/features/quran/KeyboardShortcutsHandler.tsx`
    - Implement global keyboard event listener
    - Ignore shortcuts when user is typing in input fields
    - _Requirements: 5.9_
  
  - [x] 11.2 Implement keyboard shortcuts
    - Space: Toggle play/pause
    - Right Arrow: Skip to next track
    - Left Arrow: Skip to previous track
    - Up Arrow: Increase volume by 10%
    - Down Arrow: Decrease volume by 10%
    - M: Toggle mute
    - F: Toggle between FULL and MINI modes
    - Escape: Minimize to MINI mode (from FULL)
    - ?: Show keyboard shortcuts help overlay
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.10_
  
  - [x] 11.3 Create keyboard shortcuts help overlay
    - Display modal with all keyboard shortcuts when ? is pressed
    - Add close button to dismiss overlay
    - Ensure overlay is accessible with keyboard navigation
    - _Requirements: 5.10_
  
  - [ ]* 11.4 Write unit tests for KeyboardShortcutsHandler
    - Test each keyboard shortcut triggers correct action
    - Test shortcuts are ignored when typing in input fields
    - Test help overlay display and dismissal
    - _Requirements: 5.1-5.10_

- [x] 12. Implement auto-hide logic for FullPlayer
  - [x] 12.1 Implement opacity reduction timer
    - Add timer that reduces opacity to 50% after 10 seconds of inactivity in FULL mode
    - Reset timer on user interaction (mouse move, touch, keyboard)
    - Restore full opacity immediately on hover
    - Never auto-hide in MINI mode
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 12.2 Implement auto-minimize on pause
    - Transition to MINI mode after 30 seconds of pause
    - Never auto-hide during first 10 seconds of playback
    - _Requirements: 11.4, 11.5_
  
  - [ ]* 12.3 Write unit tests for auto-hide logic
    - Test opacity reduction after 10 seconds
    - Test opacity restoration on interaction
    - Test auto-minimize after 30 seconds of pause
    - Test no auto-hide in MINI mode
    - _Requirements: 11.1-11.5_

- [x] 13. Implement QuranPlayerBar root component
  - [x] 13.1 Update QuranPlayerBar to orchestrate player modes
    - Modify `src/components/features/quran/QuranPlayerBar.tsx`
    - Render appropriate player mode based on playerMode state
    - Use AnimatePresence for smooth transitions between modes
    - Integrate KeyboardShortcutsHandler component
    - _Requirements: 2.1, 2.6, 2.7_
  
  - [x] 13.2 Implement mode transition animations
    - Use Framer Motion for smooth 300ms transitions
    - Animate height, opacity, and scale changes
    - _Requirements: 17.2_
  
  - [x] 13.3 Implement swipe gestures for mobile
    - Add swipe down gesture to minimize (FULL → MINI)
    - Add swipe up gesture to expand (MINI → FULL)
    - _Requirements: 4.4_
  
  - [x] 13.4 Add cleanup logic
    - Clean up event listeners on unmount
    - Clean up timers on unmount
    - _Requirements: 16.6_
  
  - [ ]* 13.5 Write integration tests for QuranPlayerBar
    - Test mode transitions (FULL ↔ MINI ↔ HIDDEN)
    - Test swipe gestures on mobile
    - Test keyboard shortcuts integration
    - Test cleanup on unmount
    - _Requirements: 2.1-2.8, 4.4, 16.6, 17.2_

- [x] 14. Checkpoint - Verify root component integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement accessibility features
  - [x] 15.1 Add ARIA labels to all interactive elements
    - Add aria-label to all buttons
    - Add aria-valuemin, aria-valuemax, aria-valuenow to sliders
    - Add role="region" to player container
    - _Requirements: 12.1_
  
  - [x] 15.2 Implement keyboard navigation
    - Ensure all controls are reachable via Tab/Shift+Tab
    - Add visible focus indicators (2px outline)
    - Ensure focus order is logical
    - _Requirements: 12.2, 12.7_
  
  - [x] 15.3 Implement screen reader announcements
    - Announce play/pause state changes
    - Announce track changes
    - Announce volume changes
    - Announce mode transitions
    - _Requirements: 12.4_
  
  - [x] 15.4 Add text alternatives for icons
    - Add aria-label or title to all icon buttons
    - Ensure visual indicators have text equivalents
    - _Requirements: 12.5_
  
  - [x] 15.5 Implement high contrast mode support
    - Test player in high contrast mode
    - Ensure all controls are visible
    - Adjust colors if needed
    - _Requirements: 12.6_
  
  - [ ]* 15.6 Write accessibility tests
    - Test keyboard navigation through all controls
    - Test screen reader announcements
    - Test focus indicators visibility
    - Test high contrast mode
    - Verify WCAG 2.1 Level AA compliance
    - _Requirements: 12.1-12.8_

---

### Phase 2: Advanced Features and Optimizations (Requirements 6-9, 11, 16-18, 20)

- [x] 16. Implement Media Session API integration
  - [x] 16.1 Create MediaSessionController component
    - Create `src/components/features/quran/MediaSessionController.tsx`
    - Check for Media Session API support
    - _Requirements: 6.7_
  
  - [x] 16.2 Implement metadata updates
    - Update MediaMetadata on track change
    - Include title, artist (Reciter), album, and artwork
    - _Requirements: 6.1, 6.6_
  
  - [x] 16.3 Implement action handlers
    - Register play/pause action handler
    - Register next track action handler
    - Register previous track action handler
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [x] 16.4 Implement position state updates
    - Update position state in real-time
    - Include duration, playbackRate, and current position
    - _Requirements: 6.5_
  
  - [ ]* 16.5 Write unit tests for MediaSessionController
    - Test metadata updates on track change
    - Test action handlers trigger correct store actions
    - Test position state updates
    - Test graceful degradation when API not supported
    - _Requirements: 6.1-6.7_

- [x] 17. Implement performance optimizations
  - [x] 17.1 Optimize progress bar updates
    - Throttle progress bar updates to once per second
    - Use requestAnimationFrame for smooth animations
    - _Requirements: 16.1, 16.7_
  
  - [x] 17.2 Optimize volume slider
    - Debounce volume slider changes (100ms)
    - Prevent excessive store updates
    - _Requirements: 16.2_
  
  - [x] 17.3 Optimize component re-renders
    - Wrap child components with React.memo
    - Use useMemo for expensive calculations
    - Use useCallback for event handlers
    - _Requirements: 16.3_
  
  - [ ]* 17.4 Write performance tests
    - Test progress bar update frequency
    - Test volume slider debouncing
    - Test component re-render counts
    - _Requirements: 16.1-16.3, 16.7_

- [x] 18. Checkpoint - Verify performance optimizations
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 3: Enhanced Features (Requirements 10, 14, 19)

- [x] 19. Implement QueueView component
  - [x] 19.1 Create QueueView component structure
    - Create `src/components/features/quran/QueueView.tsx`
    - Implement scrollable list with custom scrollbar styling
    - Display queue position (e.g., "Track 3 of 10")
    - _Requirements: 10.2, 10.7_
  
  - [x] 19.2 Implement drag-and-drop reordering
    - Install and configure @dnd-kit/core
    - Implement DndContext with closestCenter collision detection
    - Implement SortableContext with verticalListSortingStrategy
    - Add smooth animations for reordering
    - _Requirements: 10.3_
  
  - [x] 19.3 Implement queue item actions
    - Add remove button for each track
    - Add click handler to select and play track
    - Highlight currently playing track
    - _Requirements: 10.4, 10.6_
  
  - [x] 19.4 Integrate QueueView into FullPlayer
    - Add collapsible queue section in FullPlayer
    - Add toggle button to show/hide queue
    - Lazy load QueueView component
    - _Requirements: 10.2, 16.4_
  
  - [ ]* 19.5 Write unit tests for QueueView
    - Test drag-and-drop reordering
    - Test remove track functionality
    - Test track selection
    - Test currently playing track highlight
    - _Requirements: 10.1-10.8_

- [x] 20. Implement SleepTimer component
  - [x] 20.1 Create SleepTimer component structure
    - Create `src/components/features/quran/SleepTimer.tsx`
    - Display preset durations: 15, 30, 45, 60, 90, 120 minutes
    - _Requirements: 14.1_
  
  - [x] 20.2 Implement timer controls
    - Add buttons for each preset duration
    - Add extend button to add 15 minutes
    - Add cancel button to stop timer
    - _Requirements: 14.4, 14.5_
  
  - [x] 20.3 Implement countdown display
    - Display remaining time in MM:SS format
    - Update display every second
    - _Requirements: 14.2_
  
  - [x] 20.4 Integrate SleepTimer into FullPlayer
    - Add sleep timer section in FullPlayer
    - Connect to store actions (setSleepTimer, extendSleepTimer, cancelSleepTimer)
    - _Requirements: 14.1-14.7_
  
  - [ ]* 20.5 Write unit tests for SleepTimer
    - Test preset duration buttons
    - Test countdown display updates
    - Test extend functionality
    - Test cancel functionality
    - _Requirements: 14.1-14.7_

- [x] 21. Final integration and testing
  - [x] 21.1 Test all player modes and transitions
    - Test FULL → MINI → HIDDEN transitions
    - Test playback continues during FULL ↔ MINI transitions
    - Test playback stops during MINI → HIDDEN transition
    - _Requirements: 2.1-2.8_
  
  - [x] 21.2 Test all playback features
    - Test repeat modes (OFF, REPEAT_ONE, REPEAT_ALL)
    - Test shuffle mode with history tracking
    - Test playback speed control
    - Test queue management
    - Test sleep timer
    - _Requirements: 7.1-7.7, 8.1-8.7, 9.1-9.7, 10.1-10.8, 14.1-14.7_
  
  - [x] 21.3 Test accessibility compliance
    - Test keyboard navigation through all controls
    - Test screen reader compatibility
    - Test focus indicators
    - Test ARIA labels
    - Test minimum touch target sizes
    - Verify WCAG 2.1 Level AA compliance
    - _Requirements: 12.1-12.8_
  
  - [x] 21.4 Test RTL support
    - Test layout mirroring in RTL mode
    - Test button positioning in RTL mode
    - Test text alignment in RTL mode
    - Test progress bar direction in RTL mode
    - _Requirements: 13.1-13.6_
  
  - [x] 21.5 Test mobile responsiveness
    - Test on mobile devices (iOS/Android)
    - Test touch target sizes
    - Test swipe gestures
    - Test volume controls visibility
    - _Requirements: 4.1-4.5_
  
  - [x] 21.6 Test error handling
    - Test audio load failures
    - Test network errors
    - Test retry logic
    - Test automatic skip on repeated failures
    - _Requirements: 15.1-15.7_
  
  - [x] 21.7 Test performance
    - Test smooth animations
    - Test no excessive re-renders
    - Test preloading next track
    - Test cleanup on unmount
    - _Requirements: 16.1-16.7, 17.1-17.7_
  
  - [x] 21.8 Test configuration persistence
    - Test settings are saved to localStorage
    - Test settings are restored on reload
    - Test invalid config handling
    - _Requirements: 18.1-18.7, 20.1-20.8_

- [x] 22. Final checkpoint - Complete implementation
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end functionality
- All code should use TypeScript for type safety
- All components should follow React best practices
- All animations should use Framer Motion for consistency
- All state management should use Zustand
- Maintain spiritual/Islamic design aesthetic with amber/gold accent colors throughout

## Dependencies

- @dnd-kit/core: For drag-and-drop queue reordering
- fast-check: For property-based testing
- framer-motion: For animations (already in project)
- zustand: For state management (already in project)

## Testing Strategy

- Property-based tests for configuration round-trip and type safety
- Unit tests for individual components and store actions
- Integration tests for component interactions and mode transitions
- Accessibility tests for WCAG 2.1 Level AA compliance
- Performance tests for optimization verification
- Manual testing for RTL support, mobile responsiveness, and visual feedback

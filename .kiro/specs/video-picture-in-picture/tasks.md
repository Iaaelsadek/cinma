# Implementation Plan: Video Picture-in-Picture Feature

## Overview

This implementation plan adds native browser Picture-in-Picture (PiP) functionality to the existing VideoPlayer component. The feature will allow users to watch videos in a floating window while browsing other content on the site. Implementation will use the native browser PiP API with graceful degradation for unsupported browsers.

## Tasks

- [x] 0. Update EmbedPlayer UI - Replace icons
  - Remove Cinema Mode button (Lightbulb icon) from EmbedPlayer controls
  - Remove Secure Stream status indicator (Signal icon) from EmbedPlayer controls
  - Add PiP button in place of Cinema Mode button
  - Position PiP button in the same location as the removed Cinema Mode button
  - Use same styling pattern as other control buttons in EmbedPlayer
  - _Requirements: UI cleanup and PiP button placement_

- [x] 1. Set up PiP detection and state management
  - Add PiP support detection using `document.pictureInPictureEnabled`
  - Create state variables for `isPiPSupported`, `isPiPActive`, and `isPiPAvailable`
  - Add helper function to check if current video source supports PiP (YouTube iframe detection)
  - Log warning to console when PiP is not supported (development mode only)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2_

- [ ]* 1.1 Write property test for PiP support detection
  - **Property 1: PiP Button Visibility Based on Support**
  - **Validates: Requirements 1.2, 1.3, 7.2, 7.3**

- [x] 2. Implement video element access and PiP toggle handler
  - [x] 2.1 Create `getVideoElement()` helper function
    - Access underlying HTML5 video element from ReactPlayer ref
    - Handle native video vs YouTube iframe cases
    - Return null for YouTube iframes (not supported)
    - _Requirements: 3.1, 7.1, 7.4_

  - [x] 2.2 Implement `handleTogglePiP()` async function
    - Check if PiP is currently active using `document.pictureInPictureElement`
    - Call `videoElement.requestPictureInPicture()` to enter PiP
    - Call `document.exitPictureInPicture()` to exit PiP
    - Handle errors with appropriate toast messages (NotSupportedError, NotAllowedError, generic)
    - Log detailed error information to console
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 10.1, 10.2, 10.3, 10.4_

- [ ]* 2.3 Write property tests for PiP toggle behavior
  - **Property 6: Keyboard Shortcut Toggle**
  - **Property 12: Error Display on Failure**
  - **Validates: Requirements 5.1, 5.3, 5.4, 3.3, 10.1, 10.2, 10.3**

- [x] 3. Add PiP event listeners and state synchronization
  - Add `enterpictureinpicture` event listener to video element
  - Add `leavepictureinpicture` event listener to video element
  - Update `isPiPActive` state when events fire
  - Call optional `onPiPEnter` and `onPiPExit` callbacks if provided
  - Clean up event listeners on component unmount or video element change
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 4.2_

- [ ]* 3.1 Write property tests for state synchronization
  - **Property 8: State Synchronization**
  - **Property 9: Exit Event Detection**
  - **Validates: Requirements 6.2, 6.3, 4.2**

- [x] 4. Create bilingual PiP messages configuration
  - Define `PIP_MESSAGES` object with Arabic and English translations
  - Include tooltip text (entry and exit states)
  - Include success message ("PiP activated")
  - Include error messages (not supported, video element error, permission denied, generic)
  - Include ARIA labels for accessibility
  - _Requirements: 2.5, 3.4, 9.1, 9.2, 9.3, 9.4, 11.1, 11.2, 11.3_

- [ ]* 4.1 Write property tests for bilingual support
  - **Property 3: Bilingual UI Elements**
  - **Property 4: Bilingual Error Messages**
  - **Property 15: Accessibility Labels**
  - **Validates: Requirements 2.5, 9.1, 9.2, 9.3, 9.4, 11.1, 11.2, 11.3**

- [x] 5. Implement PiP button component
  - [x] 5.1 Create PiPButton component with props interface
    - Accept `isActive`, `isSupported`, `onClick`, and `lang` props
    - Return null if PiP is not supported (hide button)
    - Render button with appropriate icon (PictureInPicture or PictureInPictureExit from lucide-react)
    - Apply active state styling (primary color when active)
    - Add bilingual tooltip using `title` attribute
    - Add bilingual `aria-label` for screen readers
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 5.2 Integrate PiP button into VideoPlayer controls
    - Position button between subtitles button and fullscreen button
    - Pass `isPiPActive`, `isPiPSupported`, `handleTogglePiP`, and `lang` as props
    - Ensure button only renders when controls are visible
    - _Requirements: 2.1, 2.2, 2.7_

- [ ]* 5.3 Write property tests for button behavior
  - **Property 2: Icon State Reflects PiP Status**
  - **Property 17: Visual Feedback on Activation**
  - **Validates: Requirements 2.3, 2.4, 3.2, 4.3, 12.1, 12.3**

- [x] 6. Add keyboard shortcut for PiP toggle
  - Add 'KeyP' case to existing keyboard handler in useEffect
  - Check if PiP is supported before toggling
  - Prevent default browser behavior for 'P' key
  - Respect existing input field check (don't trigger when typing)
  - Update keyboard handler dependencies to include PiP state
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 6.1 Write property test for keyboard shortcut
  - **Property 7: Input Context Filtering**
  - **Validates: Requirements 5.2**

- [x] 7. Implement PiP cleanup on unmount
  - Add cleanup effect that runs on component unmount
  - Check if `document.pictureInPictureElement` exists
  - Call `document.exitPictureInPicture()` if PiP is active
  - Catch and log any errors during cleanup (non-fatal)
  - _Requirements: 6.6, 8.5_

- [ ]* 7.1 Write property test for cleanup behavior
  - **Property 10: Cleanup on Unmount**
  - **Property 14: Navigation Cleanup**
  - **Validates: Requirements 6.6, 8.5**

- [x] 8. Add toast notifications for PiP events
  - Display success toast when PiP is activated ("تم تفعيل PiP" / "PiP activated")
  - Set success toast duration to 2 seconds
  - Set error toast duration to 5 seconds
  - Use existing toast system in the application
  - Ensure toasts are bilingual based on current language
  - _Requirements: 3.3, 3.4, 10.1, 10.2, 10.3, 10.5, 12.3, 12.4_

- [x] 9. Add screen reader announcements for PiP state changes
  - Create `announceToScreenReader()` helper function
  - Create ARIA live region with role="status" and aria-live="polite"
  - Announce when PiP is activated
  - Announce when PiP is deactivated
  - Remove announcement element after 1 second
  - _Requirements: 11.6_

- [ ]* 9.1 Write property test for screen reader announcements
  - **Property 16: Screen Reader Announcements**
  - **Validates: Requirements 11.6**

- [x] 10. Update VideoPlayer props interface
  - Add optional `onPiPEnter?: () => void` callback prop
  - Add optional `onPiPExit?: () => void` callback prop
  - Document new props in JSDoc comments
  - _Requirements: Integration with parent components_

- [x] 11. Handle YouTube-specific PiP limitations
  - Detect YouTube videos using URL pattern matching
  - Set `isPiPAvailable` to false for YouTube iframes
  - Hide PiP button when YouTube video is in iframe mode
  - Add informative error message if user attempts PiP on YouTube iframe
  - Suggest opening video on YouTube for PiP support
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 11.1 Write property test for YouTube detection
  - **Property 11: YouTube Source Detection**
  - **Validates: Requirements 7.1**

- [x] 12. Checkpoint - Ensure all tests pass
  - Run all unit tests and property-based tests
  - Verify PiP works in supported browsers (Chrome, Firefox, Safari, Edge)
  - Test keyboard shortcuts and button interactions
  - Verify bilingual support for both Arabic and English
  - Test error handling for unsupported browsers
  - Ask the user if questions arise

- [x] 13. Test playback state preservation
  - Verify play/pause state is preserved when entering PiP
  - Verify volume level is preserved during PiP transitions
  - Verify current playback time is preserved
  - Verify playback rate is preserved
  - Test both entering and exiting PiP
  - _Requirements: 3.6, 4.4_

- [ ]* 13.1 Write property test for state preservation
  - **Property 5: Playback State Preservation**
  - **Validates: Requirements 3.6, 4.4**

- [x] 14. Integration testing with content pages
  - Test PiP on MovieDetails page with trailer videos
  - Test PiP on TVSeriesDetails page with trailer videos
  - Test PiP on AnimeDetails page with trailer videos
  - Verify PiP exits when navigating to different video
  - Verify PiP window remains when navigating away from video page
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 15. Final checkpoint - Verify all requirements
  - Ensure all acceptance criteria are met
  - Verify accessibility compliance (ARIA labels, keyboard navigation, screen reader support)
  - Test error handling for all error types
  - Verify bilingual support across all UI elements
  - Confirm graceful degradation for unsupported browsers
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation builds on the existing VideoPlayer component without breaking changes
- PiP feature is progressively enhanced - site works normally when unsupported
- All bilingual text uses the existing `useLang` hook for consistency

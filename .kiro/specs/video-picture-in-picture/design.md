# Design Document: Video Picture-in-Picture Feature

## Overview

This design document specifies the technical implementation for adding native browser Picture-in-Picture (PiP) functionality to the video player component. The feature enables users to watch videos in a floating window while browsing other content on the site.

### Goals

- Implement native browser PiP API for HTML5 video elements
- Provide seamless PiP experience for both native videos and YouTube embeds
- Maintain playback state consistency across PiP transitions
- Support bilingual UI (Arabic/English) with proper accessibility
- Integrate keyboard shortcuts for quick PiP activation

### Non-Goals

- Custom PiP window implementation (we use native browser API)
- PiP for non-video content
- Cross-tab PiP synchronization
- Mobile PiP (relies on browser/OS support)

### Key Design Decisions

1. **Native API First**: Use browser's `document.pictureInPictureEnabled` and `HTMLVideoElement.requestPictureInPicture()` rather than custom implementation
2. **YouTube Limitation**: YouTube iframes have limited PiP support; we'll detect and handle gracefully
3. **State Management**: Use React state within VideoPlayer component rather than global store (PiP is player-specific)
4. **Progressive Enhancement**: Feature is optional; gracefully degrades when unsupported

## Architecture

### Component Structure

```
VideoPlayer (Enhanced)
├── PiP Detection Logic
├── PiP Button Component
├── PiP State Management
├── Event Listeners (enterpictureinpicture, leavepictureinpicture)
└── Keyboard Handler (P key)
```

### Data Flow

```
User Action (Click/Keyboard)
    ↓
PiP Toggle Handler
    ↓
Browser PiP API Call
    ↓
PiP Event Listener
    ↓
State Update (isPiPActive)
    ↓
UI Update (Button Icon)
```

### Integration Points

1. **VideoPlayer Component** (`src/components/features/media/VideoPlayer.tsx`)
   - Primary integration point
   - Contains all PiP logic
   - Manages video element reference

2. **Content Pages** (MovieDetails, SeriesDetails, AnimeDetails)
   - No changes required
   - VideoPlayer component handles PiP internally

3. **Language System** (`useLang` hook)
   - Used for bilingual tooltips and error messages

4. **Toast Notifications** (existing system)
   - Display PiP activation/error messages

## Components and Interfaces

### Enhanced VideoPlayer Props

```typescript
interface VideoPlayerProps {
  url: string
  subtitles?: SubtitleTrack[]
  introStart?: number
  introEnd?: number
  title?: string
  poster?: string
  onProgress?: (state: ProgressState) => void
  onPlay?: () => void
  onPause?: () => void
  onDuration?: (duration: number) => void
  playing?: boolean
  seekTo?: number
  // New PiP-related props (optional)
  onPiPEnter?: () => void
  onPiPExit?: () => void
}
```

### PiP State Interface

```typescript
interface PiPState {
  isSupported: boolean      // Browser supports PiP
  isActive: boolean         // PiP currently active
  isAvailable: boolean      // Video element ready for PiP
}
```

### PiP Button Component

```typescript
interface PiPButtonProps {
  isActive: boolean
  isSupported: boolean
  onClick: () => void
  lang: Lang
}
```

## Data Models

### PiP Configuration

```typescript
const PIP_CONFIG = {
  KEYBOARD_SHORTCUT: 'KeyP',
  TOAST_DURATION: 2000,      // Success message
  ERROR_TOAST_DURATION: 5000, // Error message
  BUTTON_POSITION: 'between-subtitles-and-fullscreen'
}
```

### Bilingual Messages

```typescript
const PIP_MESSAGES = {
  ar: {
    tooltip: 'صورة داخل صورة',
    tooltipExit: 'إيقاف صورة داخل صورة',
    activated: 'تم تفعيل PiP',
    errorGeneric: 'فشل تفعيل PiP',
    errorNotSupported: 'المتصفح لا يدعم PiP',
    errorVideoElement: 'فشل تفعيل PiP للفيديو',
    errorPermission: 'يرجى السماح بـ PiP في إعدادات المتصفح',
    ariaLabel: 'تفعيل صورة داخل صورة',
    ariaLabelExit: 'إيقاف صورة داخل صورة'
  },
  en: {
    tooltip: 'Picture in Picture',
    tooltipExit: 'Exit Picture in Picture',
    activated: 'PiP activated',
    errorGeneric: 'Failed to activate PiP',
    errorNotSupported: 'Browser does not support PiP',
    errorVideoElement: 'Failed to activate PiP for video',
    errorPermission: 'Please allow PiP in browser settings',
    ariaLabel: 'Activate Picture in Picture',
    ariaLabelExit: 'Exit Picture in Picture'
  }
}
```


## Implementation Details

### 1. PiP Detection and Initialization

On component mount, detect browser PiP support:

```typescript
useEffect(() => {
  const checkPiPSupport = () => {
    if (!document.pictureInPictureEnabled) {
      logger.warn('Picture-in-Picture is not supported in this browser')
      setPiPSupported(false)
      return
    }
    setPiPSupported(true)
  }
  
  checkPiPSupport()
}, [])
```

### 2. Video Element Reference

Access the underlying HTML5 video element from ReactPlayer:

```typescript
const getVideoElement = (): HTMLVideoElement | null => {
  if (!playerRef.current) return null
  
  // ReactPlayer exposes internal player via getInternalPlayer()
  const internalPlayer = playerRef.current.getInternalPlayer()
  
  // For native videos, this returns the video element directly
  if (internalPlayer instanceof HTMLVideoElement) {
    return internalPlayer
  }
  
  // For YouTube, iframe doesn't support PiP via our API
  return null
}
```

### 3. PiP Activation Handler

```typescript
const handleTogglePiP = async () => {
  try {
    const videoElement = getVideoElement()
    
    if (!videoElement) {
      showToast(PIP_MESSAGES[lang].errorVideoElement, 'error')
      return
    }
    
    if (document.pictureInPictureElement) {
      // Exit PiP
      await document.exitPictureInPicture()
    } else {
      // Enter PiP
      await videoElement.requestPictureInPicture()
      showToast(PIP_MESSAGES[lang].activated, 'success')
    }
  } catch (error) {
    logger.error('PiP error:', error)
    
    if (error.name === 'NotSupportedError') {
      showToast(PIP_MESSAGES[lang].errorNotSupported, 'error')
    } else if (error.name === 'NotAllowedError') {
      showToast(PIP_MESSAGES[lang].errorPermission, 'error')
    } else {
      showToast(PIP_MESSAGES[lang].errorGeneric, 'error')
    }
  }
}
```

### 4. PiP Event Listeners

```typescript
useEffect(() => {
  const videoElement = getVideoElement()
  if (!videoElement) return
  
  const handleEnterPiP = () => {
    setIsPiPActive(true)
    onPiPEnter?.()
  }
  
  const handleLeavePiP = () => {
    setIsPiPActive(false)
    onPiPExit?.()
  }
  
  videoElement.addEventListener('enterpictureinpicture', handleEnterPiP)
  videoElement.addEventListener('leavepictureinpicture', handleLeavePiP)
  
  return () => {
    videoElement.removeEventListener('enterpictureinpicture', handleEnterPiP)
    videoElement.removeEventListener('leavepictureinpicture', handleLeavePiP)
  }
}, [playerRef.current, onPiPEnter, onPiPExit])
```

### 5. Keyboard Shortcut Integration

Add to existing keyboard handler:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
      return
    }
    
    switch (e.code) {
      // ... existing cases ...
      
      case 'KeyP':
        e.preventDefault()
        if (isPiPSupported) {
          handleTogglePiP()
        }
        break
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [playing, muted, isFullscreen, isPiPSupported, isPiPActive])
```

### 6. PiP Button Component

```typescript
const PiPButton = ({ isActive, isSupported, onClick, lang }: PiPButtonProps) => {
  if (!isSupported) return null
  
  const messages = PIP_MESSAGES[lang]
  
  return (
    <button
      onClick={onClick}
      className={clsx(
        "text-white hover:text-primary transition-colors",
        isActive && "text-primary"
      )}
      aria-label={isActive ? messages.ariaLabelExit : messages.ariaLabel}
      title={isActive ? messages.tooltipExit : messages.tooltip}
    >
      {isActive ? (
        <PictureInPictureExit size={22} />
      ) : (
        <PictureInPicture size={22} />
      )}
    </button>
  )
}
```

### 7. Cleanup on Unmount

```typescript
useEffect(() => {
  return () => {
    // Exit PiP when component unmounts
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(err => {
        logger.warn('Failed to exit PiP on unmount:', err)
      })
    }
  }
}, [])
```

### 8. YouTube Handling

For YouTube videos, detect iframe limitations:

```typescript
const isPiPAvailable = useMemo(() => {
  if (!isPiPSupported) return false
  if (fallbackToIframe && isYouTube) return false // YouTube iframe doesn't support our PiP
  return true
}, [isPiPSupported, fallbackToIframe, isYouTube])
```

## Error Handling

### Error Categories

1. **Browser Not Supported**
   - Detection: `!document.pictureInPictureEnabled`
   - Action: Hide PiP button, log warning

2. **Video Element Not Ready**
   - Detection: `getVideoElement()` returns null
   - Action: Show error toast, log error

3. **Permission Denied**
   - Detection: `NotAllowedError` exception
   - Action: Show permission error toast with instructions

4. **Not Supported Error**
   - Detection: `NotSupportedError` exception
   - Action: Show browser support error toast

5. **Generic Errors**
   - Detection: Any other exception
   - Action: Show generic error toast, log detailed error

### Error Recovery

- All errors are non-fatal; video playback continues
- User can retry PiP activation after error
- Detailed errors logged to console for debugging

### Edge Cases

1. **Component Unmounts During PiP**
   - Solution: Exit PiP gracefully in cleanup effect

2. **User Closes PiP Window**
   - Solution: `leavepictureinpicture` event updates state automatically

3. **Navigation While PiP Active**
   - Solution: Browser maintains PiP window; our cleanup exits it

4. **Multiple Videos on Page**
   - Solution: Browser allows only one PiP at a time; handled automatically

## Testing Strategy

### Unit Tests

Focus on specific logic and edge cases:

1. **PiP Support Detection**
   - Test when `document.pictureInPictureEnabled` is true/false
   - Verify button visibility based on support

2. **Video Element Retrieval**
   - Test with native video (HTMLVideoElement)
   - Test with YouTube iframe (should return null)
   - Test with null playerRef

3. **Error Message Selection**
   - Test each error type returns correct bilingual message
   - Test language switching updates messages

4. **Keyboard Shortcut**
   - Test 'P' key triggers PiP when supported
   - Test 'P' key ignored when typing in input
   - Test 'P' key does nothing when unsupported

5. **State Management**
   - Test isPiPActive updates on enter/leave events
   - Test button icon changes based on state

6. **Cleanup**
   - Test PiP exits when component unmounts
   - Test event listeners are removed

### Property-Based Tests

Property tests will run with minimum 100 iterations to validate universal behaviors:


## Property Reflection

After analyzing all acceptance criteria, I've identified the following redundancies and consolidations:

**Redundancies Identified:**

1. **Button Visibility Properties (1.2, 1.3, 7.2, 7.3)**: These can be consolidated into one comprehensive property about button visibility based on support status.

2. **Icon State Properties (2.3, 2.4, 3.2, 4.3)**: These all test that the icon reflects PiP state and can be combined into one property.

3. **State Management Properties (6.2, 6.3)**: These test that isPiPActive reflects PiP status and can be combined.

4. **Playback State Preservation (3.6, 4.4)**: Both test state preservation during PiP transitions - can be combined into one bidirectional property.

5. **Bilingual Support (2.5, 3.4, 9.1-9.4)**: Multiple properties test bilingual messages - can be consolidated into comprehensive bilingual properties.

6. **Keyboard Toggle (5.1, 5.3, 5.4)**: 5.3 and 5.4 are specific cases of 5.1's toggle behavior - 5.1 subsumes them.

7. **Error Handling (3.3, 10.1-10.3)**: Can consolidate into one property about error display with specific examples for error types.

**Consolidated Properties:**

After reflection, we'll focus on these unique, non-redundant properties:

1. PiP button visibility based on support (consolidates 1.2, 1.3, 7.2, 7.3)
2. Icon state reflects PiP status (consolidates 2.3, 2.4, 3.2, 4.3)
3. Bilingual UI elements (consolidates 2.5, 9.1-9.4)
4. Bilingual error messages (consolidates 3.4, 9.3-9.4)
5. Playback state preservation during PiP transitions (consolidates 3.6, 4.4)
6. Keyboard shortcut toggles PiP (consolidates 5.1, 5.3, 5.4)
7. Keyboard shortcut respects input context (5.2)
8. PiP state synchronization (consolidates 6.2, 6.3)
9. Event detection for PiP exit (4.2)
10. Cleanup on unmount (6.6)
11. YouTube source detection (7.1)
12. Error display on failure (consolidates 3.3, 10.1-10.3)
13. Error logging (10.4)
14. Navigation cleanup (8.5)
15. Accessibility labels (consolidates 11.1, 11.2, 11.3)
16. Screen reader announcements (11.6)
17. Visual feedback on activation (consolidates 12.1, 12.3)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: PiP Button Visibility Based on Support

*For any* VideoPlayer instance, the PiP button should be visible if and only if PiP is supported by the browser and available for the current video source type.

**Validates: Requirements 1.2, 1.3, 7.2, 7.3**

### Property 2: Icon State Reflects PiP Status

*For any* PiP state (active or inactive), the button icon should match that state—showing the exit icon when active and the entry icon when inactive.

**Validates: Requirements 2.3, 2.4, 3.2, 4.3**

### Property 3: Bilingual UI Elements

*For any* language setting (Arabic or English), all PiP UI elements (tooltips, button labels) should display text in the correct language.

**Validates: Requirements 2.5, 9.1, 9.2**

### Property 4: Bilingual Error Messages

*For any* error condition and language setting, error messages should display in the correct language with appropriate text for the error type.

**Validates: Requirements 3.4, 9.3, 9.4**

### Property 5: Playback State Preservation

*For any* playback state (playing/paused, volume level, current time), entering or exiting PiP should preserve that state without modification.

**Validates: Requirements 3.6, 4.4**

### Property 6: Keyboard Shortcut Toggle

*For any* PiP state, pressing the 'P' key should toggle to the opposite state (inactive → active, active → inactive).

**Validates: Requirements 5.1, 5.3, 5.4**

### Property 7: Input Context Filtering

*For any* keyboard event where the target is an input or textarea element, the 'P' key shortcut should be ignored and not trigger PiP.

**Validates: Requirements 5.2**

### Property 8: State Synchronization

*For any* PiP activation or deactivation event, the `isPiPActive` state variable should be updated to match the actual PiP status.

**Validates: Requirements 6.2, 6.3**

### Property 9: Exit Event Detection

*For any* PiP window close action (user closes the window), the `leavepictureinpicture` event should be detected and handled.

**Validates: Requirements 4.2**

### Property 10: Cleanup on Unmount

*For any* component unmount while PiP is active, `document.exitPictureInPicture()` should be called to gracefully exit PiP.

**Validates: Requirements 6.6**

### Property 11: YouTube Source Detection

*For any* video URL that contains 'youtube.com' or 'youtu.be', the system should identify it as a YouTube video and apply YouTube-specific PiP handling.

**Validates: Requirements 7.1**

### Property 12: Error Display on Failure

*For any* PiP activation failure, an error toast should be displayed with a message appropriate to the error type (NotSupportedError, NotAllowedError, or generic).

**Validates: Requirements 3.3, 10.1, 10.2, 10.3**

### Property 13: Error Logging

*For any* error during PiP operations, detailed error information should be logged to the console for debugging purposes.

**Validates: Requirements 10.4**

### Property 14: Navigation Cleanup

*For any* navigation event while PiP is active, the previous video's PiP should be exited before the new page loads.

**Validates: Requirements 8.5**

### Property 15: Accessibility Labels

*For any* PiP state, the button should have an appropriate `aria-label` that describes the current action (activate when inactive, exit when active) in the current language.

**Validates: Requirements 11.1, 11.2, 11.3**

### Property 16: Screen Reader Announcements

*For any* PiP state change (entering or exiting), an announcement should be made to screen readers to inform users of the change.

**Validates: Requirements 11.6**

### Property 17: Visual Feedback on Activation

*For any* successful PiP activation, visual feedback should be provided through both button color change and a success toast notification.

**Validates: Requirements 12.1, 12.3**


### Testing Strategy

#### Dual Testing Approach

We will implement both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** will focus on:
- Specific examples of PiP support detection
- Exact error message content for each error type
- DOM structure and button positioning
- Event listener registration and cleanup
- Specific keyboard shortcuts and their preventDefault behavior
- Integration with content pages (MovieDetails, SeriesDetails, AnimeDetails)

**Property-Based Tests** will focus on:
- Universal behaviors across all video states
- State preservation across PiP transitions
- Bilingual support across all UI elements
- Error handling across all error types
- Accessibility attributes across all states

#### Property-Based Testing Configuration

We will use **fast-check** (JavaScript/TypeScript property-based testing library) for property tests:

```typescript
import fc from 'fast-check'

// Example property test structure
describe('PiP Property Tests', () => {
  it('Property 1: Button visibility based on support', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isPiPSupported
        fc.boolean(), // isYouTube
        fc.boolean(), // fallbackToIframe
        (isPiPSupported, isYouTube, fallbackToIframe) => {
          // Test logic
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

Each property test will:
- Run minimum 100 iterations
- Include a comment tag: `// Feature: video-picture-in-picture, Property X: [property text]`
- Reference the corresponding design document property
- Generate random but valid test inputs

#### Test Organization

```
src/__tests__/video-picture-in-picture/
├── unit/
│   ├── pip-detection.test.tsx
│   ├── pip-button.test.tsx
│   ├── pip-keyboard.test.tsx
│   ├── pip-errors.test.tsx
│   └── pip-integration.test.tsx
└── properties/
    ├── pip-state-preservation.property.test.tsx
    ├── pip-bilingual.property.test.tsx
    ├── pip-accessibility.property.test.tsx
    └── pip-error-handling.property.test.tsx
```

#### Example Test Cases

**Unit Test Example:**
```typescript
describe('PiP Support Detection', () => {
  it('should hide button when PiP is not supported', () => {
    // Mock document.pictureInPictureEnabled = false
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: false,
      configurable: true
    })
    
    const { queryByLabelText } = render(<VideoPlayer url="test.mp4" />)
    
    expect(queryByLabelText(/picture in picture/i)).not.toBeInTheDocument()
  })
})
```

**Property Test Example:**
```typescript
// Feature: video-picture-in-picture, Property 5: Playback state preservation
describe('Property 5: Playback State Preservation', () => {
  it('should preserve playback state during PiP transitions', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // playing
        fc.float({ min: 0, max: 1 }), // volume
        fc.float({ min: 0, max: 100 }), // currentTime
        async (playing, volume, currentTime) => {
          // Setup video with state
          const videoElement = setupVideoWithState({ playing, volume, currentTime })
          
          // Enter PiP
          await videoElement.requestPictureInPicture()
          
          // Verify state preserved
          expect(videoElement.paused).toBe(!playing)
          expect(videoElement.volume).toBeCloseTo(volume, 2)
          expect(videoElement.currentTime).toBeCloseTo(currentTime, 1)
          
          // Exit PiP
          await document.exitPictureInPicture()
          
          // Verify state still preserved
          expect(videoElement.paused).toBe(!playing)
          expect(videoElement.volume).toBeCloseTo(volume, 2)
          expect(videoElement.currentTime).toBeCloseTo(currentTime, 1)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

## Security Considerations

### Browser API Security

1. **Permission Model**: PiP API requires user gesture (click/keyboard) to activate
   - Our implementation respects this by only calling API in response to user actions
   - No automatic PiP activation on page load

2. **Cross-Origin Restrictions**: PiP may be restricted for cross-origin videos
   - We handle this with proper error messages
   - YouTube videos have additional restrictions due to iframe sandboxing

3. **Feature Policy**: Sites can control PiP via Feature-Policy header
   - We detect and handle when PiP is disabled by policy
   - Graceful degradation when feature is unavailable

### Data Privacy

- No user data is collected or transmitted for PiP functionality
- PiP state is ephemeral (not persisted to storage)
- No tracking of PiP usage

## Performance Considerations

### Minimal Overhead

1. **Lazy Detection**: PiP support is checked once on mount, not on every render
2. **Event Listener Efficiency**: Event listeners are properly cleaned up to prevent memory leaks
3. **No Polling**: We use native events rather than polling for PiP state
4. **Conditional Rendering**: PiP button only renders when supported

### Browser Resource Usage

- PiP window is managed by the browser, not our code
- Video decoding happens in browser's media pipeline
- No additional video streams or duplicated resources

### Optimization Strategies

```typescript
// Memoize PiP availability check
const isPiPAvailable = useMemo(() => {
  if (!isPiPSupported) return false
  if (fallbackToIframe && isYouTube) return false
  return true
}, [isPiPSupported, fallbackToIframe, isYouTube])

// Debounce rapid PiP toggles
const debouncedTogglePiP = useMemo(
  () => debounce(handleTogglePiP, 300),
  [handleTogglePiP]
)
```

## Browser Compatibility

### Supported Browsers

| Browser | Version | PiP Support | Notes |
|---------|---------|-------------|-------|
| Chrome | 70+ | ✅ Full | Best support |
| Edge | 79+ | ✅ Full | Chromium-based |
| Safari | 13.1+ | ✅ Full | macOS/iOS |
| Firefox | 69+ | ✅ Full | Desktop only |
| Opera | 57+ | ✅ Full | Chromium-based |

### Unsupported Browsers

- Internet Explorer (all versions)
- Chrome < 70
- Firefox < 69
- Safari < 13.1

### Fallback Behavior

When PiP is not supported:
1. PiP button is hidden
2. Keyboard shortcut 'P' is disabled
3. Warning logged to console (development only)
4. Video player functions normally otherwise

### Feature Detection

```typescript
const checkPiPSupport = (): boolean => {
  // Check for API existence
  if (!document.pictureInPictureEnabled) {
    return false
  }
  
  // Check for video element support
  const video = document.createElement('video')
  if (typeof video.requestPictureInPicture !== 'function') {
    return false
  }
  
  return true
}
```

## Accessibility Compliance

### WCAG 2.1 Guidelines

Our PiP implementation follows WCAG 2.1 Level AA standards:

1. **Perceivable**
   - Visual feedback (icon change, color change)
   - Toast notifications for state changes
   - Screen reader announcements

2. **Operable**
   - Keyboard accessible (Tab navigation, Enter/Space activation)
   - Keyboard shortcut ('P' key)
   - No keyboard traps

3. **Understandable**
   - Clear button labels (aria-label)
   - Bilingual support
   - Consistent behavior

4. **Robust**
   - Semantic HTML
   - ARIA attributes
   - Compatible with assistive technologies

### Screen Reader Support

```typescript
// ARIA live region for announcements
const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}
```

### Keyboard Navigation

- Tab: Navigate to PiP button
- Enter/Space: Activate PiP button
- P: Toggle PiP (when not in input field)
- Escape: Exit fullscreen (browser default, also exits PiP)

## Monitoring and Debugging

### Logging Strategy

```typescript
// Development logging
if (import.meta.env.DEV) {
  logger.debug('PiP support detected:', isPiPSupported)
  logger.debug('PiP state changed:', { isActive: isPiPActive })
}

// Production error logging
logger.error('PiP activation failed:', {
  error: error.name,
  message: error.message,
  videoUrl: url,
  isYouTube,
  timestamp: new Date().toISOString()
})
```

### Metrics to Track

1. **Feature Usage**
   - PiP activation count
   - PiP duration (time in PiP mode)
   - Exit method (button vs window close)

2. **Error Rates**
   - Activation failures by error type
   - Browser/OS distribution of errors
   - YouTube vs native video failures

3. **User Behavior**
   - Keyboard shortcut usage vs button clicks
   - Navigation patterns while PiP active
   - Content types most used with PiP

### Debug Tools

```typescript
// Expose PiP state in development
if (import.meta.env.DEV) {
  (window as any).__PIP_DEBUG__ = {
    isSupported: isPiPSupported,
    isActive: isPiPActive,
    videoElement: getVideoElement(),
    forceExit: () => document.exitPictureInPicture(),
    getState: () => ({
      playing,
      volume,
      currentTime: playerRef.current?.getCurrentTime()
    })
  }
}
```

## Future Enhancements

### Potential Improvements (Out of Scope for v1)

1. **PiP Controls API**
   - Add custom controls to PiP window (play/pause, skip)
   - Requires Media Session API integration

2. **PiP Window Customization**
   - Custom aspect ratios
   - Overlay text/subtitles in PiP window

3. **Multi-Video PiP**
   - Queue multiple videos for PiP
   - Switch between PiP videos

4. **PiP Analytics Dashboard**
   - Usage statistics
   - Error tracking
   - User engagement metrics

5. **Mobile PiP Optimization**
   - Android PiP API integration
   - iOS PiP enhancements

6. **Auto-PiP on Scroll**
   - Automatically enter PiP when video scrolls out of view
   - User preference setting

## Migration and Rollout

### Deployment Strategy

1. **Phase 1: Development**
   - Implement feature in VideoPlayer component
   - Add comprehensive tests
   - Test across browsers

2. **Phase 2: Staging**
   - Deploy to staging environment
   - Internal testing
   - Accessibility audit

3. **Phase 3: Production Rollout**
   - Deploy to production
   - Monitor error rates
   - Collect user feedback

### Rollback Plan

If critical issues are discovered:
1. Feature flag to disable PiP button
2. Hide button via CSS (emergency)
3. Revert commit if necessary

### Success Metrics

- Zero critical bugs in first week
- < 1% error rate for PiP activation
- Positive user feedback
- No accessibility violations

## Documentation

### User Documentation

Create user-facing documentation:
- How to use PiP feature
- Keyboard shortcuts guide
- Troubleshooting common issues
- Browser compatibility information

### Developer Documentation

Update developer docs:
- VideoPlayer component API
- PiP implementation details
- Testing guidelines
- Debugging tips

## Conclusion

This design provides a comprehensive implementation plan for adding native Picture-in-Picture functionality to the video player. The implementation:

- Uses native browser APIs for optimal performance
- Provides graceful degradation for unsupported browsers
- Maintains full accessibility compliance
- Supports bilingual UI (Arabic/English)
- Includes comprehensive testing strategy
- Handles errors gracefully with clear user feedback

The feature enhances user experience by allowing video playback while browsing other content, a common use case for trailer videos on content detail pages.

# Design Document Summary

## Overview

Comprehensive design for enhancing the Quran audio player with a 3-state system (FULL, MINI, HIDDEN), advanced playback features, and full accessibility compliance. The design addresses 20 requirements across 3 implementation phases.

## Key Design Decisions

### 1. Three-State Player System
- **FULL Mode**: Expanded view with all controls (queue, sleep timer, speed, repeat, shuffle)
- **MINI Mode**: Compact bar with essential controls (play/pause, skip, track info)
- **HIDDEN Mode**: Completely hidden, playback stopped

### 2. State Management
- Enhanced Zustand store with new state for modes, repeat, shuffle, queue, sleep timer
- Centralized configuration management with localStorage persistence
- Round-trip property validation for configuration serialization

### 3. Accessibility First
- All interactive elements meet 44x44px touch target minimum
- Complete ARIA labels and roles on all controls
- Keyboard navigation with comprehensive shortcuts
- Screen reader announcements for state changes
- WCAG 2.1 Level AA compliance

### 4. RTL Support
- Mirrored layouts using CSS logical properties
- Direction-aware progress bar calculations
- Reversed button order for RTL languages
- Icon mirroring where appropriate

### 5. Error Handling
- Network error recovery with exponential backoff (3 retries)
- Auto-skip to next track after failed retries
- Graceful degradation for unsupported APIs
- User-friendly error messages with retry options

## Architecture Highlights

### Component Structure
```
QuranPlayerBar (Root)
├── FullPlayer (All features)
├── MiniPlayer (Essential controls)
├── KeyboardShortcutsHandler (Global shortcuts)
└── MediaSessionController (System integration)
```

### Data Flow
```
User Action → Store Action → State Update → Audio Controller → HTML5 Audio
                                         ↓
                                   UI Re-render
```

## Correctness Properties

6 properties identified covering:
1. Configuration round-trip preservation
2. Configuration validation
3. Shuffle history (no premature repeats)
4. State persistence round-trip
5. Touch target size compliance
6. ARIA label presence

## Testing Strategy

**Dual Approach**:
- **Unit Tests**: Specific scenarios, edge cases, integration points
- **Property Tests**: Universal properties with 100+ iterations using fast-check

**Test Coverage**:
- Mode transitions
- Keyboard shortcuts
- Media Session API
- Repeat/shuffle modes
- Sleep timer
- Error recovery
- RTL layout
- Accessibility

## Performance Optimizations

1. **Rendering**: Progress bar throttled to 1 update/second
2. **Memoization**: React.memo for static components
3. **Lazy Loading**: Queue view loaded on demand
4. **Debouncing**: Volume changes debounced 300ms
5. **Preloading**: Next track preloaded at 80% progress
6. **Memory**: Comprehensive cleanup on unmount

## Implementation Phases

### Phase 1 (Weeks 1-3): Critical Features
- Three-state system
- Visible close button
- Persistent mini player
- Mobile controls
- Keyboard navigation
- Accessibility compliance
- RTL support
- Error handling

### Phase 2 (Weeks 4-6): Important Features
- Media Session API
- Repeat modes
- Shuffle mode
- Playback speed
- Auto-hide logic
- Performance optimizations
- Animations
- State persistence
- Configuration parser

### Phase 3 (Weeks 7-8): Nice to Have
- Queue management with drag-and-drop
- Sleep timer
- Enhanced track information

## Technical Stack

- **State**: Zustand
- **Animations**: Framer Motion
- **Audio**: HTML5 Audio API + Media Session API
- **Testing**: Vitest + fast-check
- **Drag-and-Drop**: @dnd-kit/core
- **Styling**: Tailwind CSS with RTL support

## Success Criteria

✅ All three player modes functional
✅ Close button always visible
✅ Mini player never auto-hides while playing
✅ All controls meet 44x44px minimum
✅ All keyboard shortcuts working
✅ WCAG 2.1 AA compliance verified
✅ RTL layout working correctly
✅ Error recovery functional
✅ All preferences persist across sessions
✅ Configuration round-trip property verified

## Files Modified/Created

### Modified
- `src/state/useQuranPlayerStore.ts` - Enhanced with new state
- `src/hooks/useQuranAudio.ts` - Error handling, preloading, sleep timer
- `src/components/features/quran/QuranPlayerBar.tsx` - Refactored for modes

### Created
- `src/components/features/quran/FullPlayer.tsx`
- `src/components/features/quran/MiniPlayer.tsx`
- `src/components/features/quran/QueueView.tsx`
- `src/components/features/quran/SleepTimer.tsx`
- `src/components/features/quran/KeyboardShortcutsHandler.tsx`
- `src/components/features/quran/MediaSessionController.tsx`
- `src/lib/quran-player-config.ts` - Parser, validator, printer
- `src/__tests__/quran-audio-player-improvements/` - Test suite

## Design Principles Followed

1. **Separation of Concerns**: Clear boundaries between UI, state, and audio control
2. **Progressive Enhancement**: Core functionality works, enhanced features add value
3. **Graceful Degradation**: Fallbacks for unsupported APIs
4. **Accessibility First**: WCAG compliance built in, not bolted on
5. **Performance Conscious**: Optimizations prevent unnecessary re-renders
6. **Testability**: Property-based tests ensure correctness across input space
7. **Maintainability**: Modular components, clear interfaces, comprehensive types


# Design Document: Quran Audio Player Improvements

## Overview

This design document specifies the technical architecture for enhancing the Quran audio player with a comprehensive 3-state system (FULL, MINI, HIDDEN), advanced playback features, and improved accessibility. The design addresses 20 requirements across 3 implementation phases while maintaining the spiritual Islamic aesthetic and ensuring compatibility with both RTL (Arabic) and LTR (English) layouts.

The current player (`QuranPlayerBar`) has critical usability issues including an invisible close button, aggressive auto-hide behavior, and missing standard audio player features. This design transforms it into a modern, accessible, and feature-rich audio player while preserving the existing spiritual design language.

### Design Goals

1. **Usability**: Provide intuitive controls with clear visual feedback
2. **Accessibility**: Meet WCAG 2.1 Level AA standards with full keyboard navigation and screen reader support
3. **Performance**: Optimize rendering and minimize re-renders for smooth operation
4. **Maintainability**: Use clear separation of concerns with modular components
5. **Spiritual Aesthetic**: Maintain amber/gold accent colors and Islamic design principles
6. **Bi-directional Support**: Full RTL and LTR layout support

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Quran Pages  │  │ Reciter List │  │ Other Pages  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                  Player Component Layer                      │
│         ┌────────────────────────────────────┐               │
│         │      QuranPlayerBar (Root)         │               │
│         │  ┌──────────────────────────────┐  │               │
│         │  │  PlayerModeController        │  │               │
│         │  │  - Manages FULL/MINI/HIDDEN  │  │               │
│         │  └──────────────────────────────┘  │               │
│         │                                    │               │
│         │  ┌──────────┐    ┌──────────┐     │               │
│         │  │FullPlayer│    │MiniPlayer│     │               │
│         │  │          │    │          │     │               │
│         │  │ ┌──────┐ │    │ ┌──────┐ │     │               │
│         │  │ │Queue │ │    │ │Basic │ │     │               │
│         │  │ │View  │ │    │ │Ctrls │ │     │               │
│         │  │ └──────┘ │    │ └──────┘ │     │               │
│         │  │ ┌──────┐ │    └──────────┘     │               │
│         │  │ │Sleep │ │                      │               │
│         │  │ │Timer │ │                      │               │
│         │  │ └──────┘ │                      │               │
│         │  └──────────┘                      │               │
│         │                                    │               │
│         │  ┌──────────────────────────────┐  │               │
│         │  │  KeyboardShortcutsHandler    │  │               │
│         │  └──────────────────────────────┘  │               │
│         │                                    │               │
│         │  ┌──────────────────────────────┐  │               │
│         │  │  MediaSessionController      │  │               │
│         │  └──────────────────────────────┘  │               │
│         └────────────────────────────────────┘               │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                   State Management Layer                     │
│         ┌────────────────────────────────────┐               │
│         │    useQuranPlayerStore (Zustand)   │               │
│         │                                    │               │
│         │  State:                            │               │
│         │  - currentTrack                    │               │
│         │  - playerMode (FULL/MINI/HIDDEN)   │               │
│         │  - isPlaying, volume, speed        │               │
│         │  - repeatMode, shuffleMode         │               │
│         │  - queue, shuffleHistory           │               │
│         │  - sleepTimer                      │               │
│         │  - currentTime, duration           │               │
│         │                                    │               │
│         │  Actions:                          │               │
│         │  - playTrack, toggle, stop         │               │
│         │  - setPlayerMode                   │               │
│         │  - setRepeatMode, setShuffleMode   │               │
│         │  - addToQueue, removeFromQueue     │               │
│         │  - setSleepTimer                   │               │
│         │  - loadConfig, saveConfig          │               │
│         └────────────────────────────────────┘               │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                   Audio Controller Layer                     │
│         ┌────────────────────────────────────┐               │
│         │      useQuranAudio (Hook)          │               │
│         │                                    │               │
│         │  - Manages HTML5 Audio element     │               │
│         │  - Syncs with store state          │               │
│         │  - Handles audio events            │               │
│         │  - Implements skip logic           │               │
│         │  - Preloads next track             │               │
│         └────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
QuranPlayerBar (Root Container)
├── PlayerModeController (Manages state transitions)
│   ├── FullPlayer (Expanded view)
│   │   ├── TrackInfo (Artwork, title, reciter, surah details)
│   │   ├── ProgressBar (Seekable timeline)
│   │   ├── PlaybackControls (Play/pause, skip, repeat, shuffle)
│   │   ├── VolumeControl (Slider with mute)
│   │   ├── SpeedControl (Dropdown: 0.5x - 2.0x)
│   │   ├── QueueView (Draggable list of upcoming tracks)
│   │   ├── SleepTimer (Preset durations with countdown)
│   │   └── CloseButton (Transitions to MINI)
│   │
│   ├── MiniPlayer (Minimized bar)
│   │   ├── TrackInfo (Compact: artwork + title)
│   │   ├── ProgressBar (Seekable, thin)
│   │   ├── PlaybackControls (Play/pause, skip only)
│   │   ├── ExpandButton (Transitions to FULL)
│   │   └── CloseButton (Transitions to HIDDEN + stops)
│   │
│   └── HiddenPlayer (No UI, playback stopped)
│
├── KeyboardShortcutsHandler (Global event listener)
│   ├── Space → Toggle play/pause
│   ├── Arrow keys → Skip, volume
│   ├── F → Toggle FULL/MINI
│   ├── Escape → Minimize
│   └── ? → Show shortcuts help
│
└── MediaSessionController (System integration)
    ├── Updates metadata on track change
    ├── Handles system play/pause/skip
    └── Updates playback position
```

### State Management Architecture

The player uses Zustand for centralized state management with the following structure:

```typescript
// Enhanced store structure
interface QuranPlayerState {
  // Existing state
  currentTrack: QuranTrack | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null
  
  // New state for 3-state system
  playerMode: PlayerMode // 'FULL' | 'MINI' | 'HIDDEN'
  
  // New state for advanced features
  playbackSpeed: number // 0.5 - 2.0
  repeatMode: RepeatMode // 'OFF' | 'REPEAT_ONE' | 'REPEAT_ALL'
  shuffleMode: boolean
  shuffleHistory: string[] // Track IDs already played in shuffle
  queue: QuranTrack[]
  currentQueueIndex: number
  
  // Sleep timer
  sleepTimer: SleepTimerState | null
  
  // UI state
  showQueue: boolean
  showKeyboardHelp: boolean
  opacity: number // For auto-hide fade
  
  // Actions (existing + new)
  playTrack: (track: QuranTrack) => void
  toggle: () => void
  stop: () => void
  setVolume: (value: number) => void
  seek: (time: number) => void
  skipNext: () => void
  skipPrev: () => void
  
  // New actions
  setPlayerMode: (mode: PlayerMode) => void
  setPlaybackSpeed: (speed: number) => void
  setRepeatMode: (mode: RepeatMode) => void
  setShuffleMode: (enabled: boolean) => void
  addToQueue: (track: QuranTrack) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  setSleepTimer: (minutes: number | null) => void
  toggleQueue: () => void
  toggleKeyboardHelp: () => void
  setOpacity: (opacity: number) => void
  
  // Configuration persistence
  loadConfig: () => void
  saveConfig: () => void
  
  // Internal updates (called by Audio Controller)
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}
```

## Components and Interfaces

### 1. QuranPlayerBar (Root Component)

**Responsibility**: Root container that orchestrates all player functionality and manages global state.

**Props**: None (uses global store)

**Key Features**:
- Renders appropriate player mode based on `playerMode` state
- Manages keyboard shortcuts via `KeyboardShortcutsHandler`
- Integrates Media Session API via `MediaSessionController`
- Handles auto-hide logic for FULL mode
- Manages animations between states using Framer Motion

**Implementation Notes**:
- Uses `AnimatePresence` for smooth transitions between modes
- Implements auto-hide timer that reduces opacity after 10s of inactivity in FULL mode
- Resets opacity on user interaction (mouse move, touch, keyboard)
- Cleans up timers and event listeners on unmount

### 2. FullPlayer Component

**Responsibility**: Expanded player view with all controls and features.

**Props**:
```typescript
interface FullPlayerProps {
  onMinimize: () => void // Callback to transition to MINI mode
}
```

**Layout** (Mobile-first, responsive):
```
┌─────────────────────────────────────────────────┐
│  [Close Button]                                 │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │         Artwork (Large, Animated)       │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Surah Name (Arabic + English)                 │
│  Reciter Name                                  │
│  Surah Details (Number, Type, Verses)          │
│                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  [Progress Bar - Seekable]                     │
│  00:00 ────────────────────────────── 45:30    │
│                                                 │
│  [◄◄]  [▶/❚❚]  [►►]  [🔁]  [🔀]              │
│                                                 │
│  [🔊 ━━━━━━━━━━ ]  [Speed: 1.0x ▼]            │
│                                                 │
│  [Queue (5) ▼]  [Sleep Timer ⏰]               │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Queue View (Collapsible)                │   │
│  │ 1. Al-Fatiha (Playing)                  │   │
│  │ 2. Al-Baqarah                           │   │
│  │ 3. Al-Imran                             │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Key Features**:
- Large artwork with spinning vinyl effect when playing
- Bilingual track information (Arabic + English)
- Full playback controls with visual feedback
- Volume slider (always visible, not hidden like current implementation)
- Playback speed dropdown
- Repeat and shuffle toggles with visual indicators
- Collapsible queue view with drag-and-drop reordering
- Sleep timer with preset durations
- Smooth animations for all interactions

### 3. MiniPlayer Component

**Responsibility**: Minimized player bar with essential controls only.

**Props**:
```typescript
interface MiniPlayerProps {
  onExpand: () => void // Callback to transition to FULL mode
  onClose: () => void // Callback to transition to HIDDEN mode
}
```

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Progress bar (top edge)
│                                                             │
│ [🖼️] Al-Fatiha - Mishary Alafasy  [◄◄][▶][►►]  [↑][✕]   │
│      00:45 / 02:30                                          │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- Compact layout optimized for minimal screen space
- Essential controls only: play/pause, skip prev/next
- Expand button to transition to FULL mode
- Close button to stop and hide
- Thin progress bar at top edge (seekable)
- Current time display
- Never auto-hides while playing

### 4. QueueView Component

**Responsibility**: Display and manage the playback queue.

**Props**:
```typescript
interface QueueViewProps {
  queue: QuranTrack[]
  currentIndex: number
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (index: number) => void
  onSelect: (index: number) => void
}
```

**Features**:
- Drag-and-drop reordering using `@dnd-kit/core`
- Remove button for each track
- Highlight currently playing track
- Display queue position (e.g., "Track 3 of 10")
- Smooth animations for reordering and removal
- Scrollable list with custom scrollbar styling

**Implementation**:
```typescript
// Use @dnd-kit for drag-and-drop
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
```

### 5. SleepTimer Component

**Responsibility**: Allow users to set a sleep timer for automatic playback stop.

**Props**:
```typescript
interface SleepTimerProps {
  onSet: (minutes: number) => void
  onCancel: () => void
  activeTimer: SleepTimerState | null
}
```

**Features**:
- Preset durations: 15, 30, 45, 60, 90, 120 minutes
- Countdown display showing remaining time
- Extend button to add more time
- Cancel button to stop timer
- Notification when 1 minute remains
- Fade-out audio over 5 seconds when timer expires

**UI**:
```
┌─────────────────────────────────────┐
│  Sleep Timer                        │
│                                     │
│  [15m] [30m] [45m] [60m] [90m] [120m]│
│                                     │
│  Active: 23:45 remaining            │
│  [Extend +15m] [Cancel]             │
└─────────────────────────────────────┘
```

### 6. KeyboardShortcutsHandler Component

**Responsibility**: Handle global keyboard shortcuts for player control.

**Implementation**:
```typescript
const KeyboardShortcutsHandler = () => {
  const { toggle, skipNext, skipPrev, setVolume, setPlayerMode, playerMode, volume } = useQuranPlayerStore()
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault()
          toggle()
          break
        case 'ArrowRight':
          e.preventDefault()
          skipNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipPrev()
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(Math.min(1, volume + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(Math.max(0, volume - 0.1))
          break
        case 'm':
        case 'M':
          setVolume(volume === 0 ? 1 : 0)
          break
        case 'f':
        case 'F':
          setPlayerMode(playerMode === 'FULL' ? 'MINI' : 'FULL')
          break
        case 'Escape':
          if (playerMode === 'FULL') {
            setPlayerMode('MINI')
          }
          break
        case '?':
          useQuranPlayerStore.getState().toggleKeyboardHelp()
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle, skipNext, skipPrev, setVolume, setPlayerMode, playerMode, volume])
  
  return null
}
```

**Keyboard Shortcuts**:
- `Space`: Toggle play/pause
- `→`: Skip to next track
- `←`: Skip to previous track
- `↑`: Increase volume by 10%
- `↓`: Decrease volume by 10%
- `M`: Toggle mute
- `F`: Toggle between FULL and MINI modes
- `Escape`: Minimize to MINI mode (from FULL)
- `?`: Show keyboard shortcuts help overlay

### 7. MediaSessionController Component

**Responsibility**: Integrate with browser Media Session API for system-level controls.

**Implementation**:
```typescript
const MediaSessionController = () => {
  const { currentTrack, isPlaying, toggle, skipNext, skipPrev, currentTime, duration } = useQuranPlayerStore()
  
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    
    if (currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.reciter,
        album: 'Quran Recitation',
        artwork: currentTrack.image ? [
          { src: currentTrack.image, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      })
      
      navigator.mediaSession.setActionHandler('play', toggle)
      navigator.mediaSession.setActionHandler('pause', toggle)
      navigator.mediaSession.setActionHandler('previoustrack', skipPrev)
      navigator.mediaSession.setActionHandler('nexttrack', skipNext)
      
      // Update position state
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: currentTime
      })
    }
    
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
      }
    }
  }, [currentTrack, isPlaying, toggle, skipNext, skipPrev, currentTime, duration])
  
  return null
}
```

### 8. Enhanced useQuranAudio Hook

**Responsibility**: Manage HTML5 Audio element and sync with store state.

**Enhancements**:
- Implement skip logic with repeat and shuffle modes
- Preload next track when current track is 80% complete
- Handle playback speed changes
- Implement sleep timer countdown and fade-out
- Handle network errors with retry logic

**Key Methods**:
```typescript
const useQuranAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const store = useQuranPlayerStore()
  
  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    // ... setup event listeners
  }, [])
  
  // Sync playback with store
  useEffect(() => {
    if (!audioRef.current) return
    
    if (store.currentTrack) {
      audioRef.current.src = store.currentTrack.url
      if (store.isPlaying) {
        audioRef.current.play().catch(handleError)
      }
    }
  }, [store.currentTrack, store.isPlaying])
  
  // Handle playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = store.playbackSpeed
      audioRef.current.preservesPitch = true // Prevent chipmunk effect
    }
  }, [store.playbackSpeed])
  
  // Implement skip logic with repeat/shuffle
  const handleTrackEnd = () => {
    if (store.repeatMode === 'REPEAT_ONE') {
      audioRef.current?.play()
      return
    }
    
    if (store.shuffleMode) {
      playRandomTrack()
    } else {
      playNextInSequence()
    }
  }
  
  // Preload next track
  useEffect(() => {
    if (store.currentTime / store.duration > 0.8) {
      preloadNextTrack()
    }
  }, [store.currentTime, store.duration])
  
  // Sleep timer countdown
  useEffect(() => {
    if (!store.sleepTimer) return
    
    const interval = setInterval(() => {
      const remaining = store.sleepTimer.endTime - Date.now()
      
      if (remaining <= 0) {
        fadeOutAndStop()
      } else if (remaining <= 60000) {
        showSleepTimerNotification()
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [store.sleepTimer])
  
  return {
    playSurah,
    isCurrentTrack,
    isPlaying: store.isPlaying,
    currentTrack: store.currentTrack
  }
}
```

## Data Models

### PlayerMode Enum

```typescript
export enum PlayerMode {
  FULL = 'FULL',
  MINI = 'MINI',
  HIDDEN = 'HIDDEN'
}
```

### RepeatMode Enum

```typescript
export enum RepeatMode {
  OFF = 'OFF',
  REPEAT_ONE = 'REPEAT_ONE',
  REPEAT_ALL = 'REPEAT_ALL'
}
```

### QuranTrack Type (Enhanced)

```typescript
export type QuranTrack = {
  id: number | string // Format: "{reciterId}-{surahId}"
  title: string // Surah name (Arabic or English based on lang)
  reciter: string // Reciter name
  url: string // Audio file URL
  image?: string | null // Reciter image or fallback
  
  // Enhanced metadata
  surahNumber?: number // 1-114
  surahType?: 'Meccan' | 'Medinan'
  ayahCount?: number // Number of verses
  arabicName?: string // Arabic name
  englishName?: string // English name
}
```

### SleepTimerState Type

```typescript
export type SleepTimerState = {
  duration: number // Total duration in minutes
  endTime: number // Timestamp when timer expires
  startTime: number // Timestamp when timer started
}
```

### PlayerConfig Type

```typescript
export type PlayerConfig = {
  volume: number // 0-1
  playbackSpeed: number // 0.5-2.0
  repeatMode: RepeatMode
  shuffleMode: boolean
  playerMode: PlayerMode
}
```

### Queue Structure

```typescript
export type QueueState = {
  tracks: QuranTrack[]
  currentIndex: number
  shuffleHistory: string[] // Track IDs already played in shuffle mode
}
```

## API Interfaces

### Store Actions Interface

```typescript
interface PlayerActions {
  // Playback control
  playTrack: (track: QuranTrack) => void
  toggle: () => void
  stop: () => void
  seek: (time: number) => void
  skipNext: () => void
  skipPrev: () => void
  
  // Player mode
  setPlayerMode: (mode: PlayerMode) => void
  
  // Audio settings
  setVolume: (volume: number) => void
  setPlaybackSpeed: (speed: number) => void
  
  // Playback modes
  setRepeatMode: (mode: RepeatMode) => void
  setShuffleMode: (enabled: boolean) => void
  
  // Queue management
  addToQueue: (track: QuranTrack) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  clearQueue: () => void
  
  // Sleep timer
  setSleepTimer: (minutes: number | null) => void
  extendSleepTimer: (minutes: number) => void
  cancelSleepTimer: () => void
  
  // UI state
  toggleQueue: () => void
  toggleKeyboardHelp: () => void
  setOpacity: (opacity: number) => void
  
  // Configuration
  loadConfig: () => void
  saveConfig: () => void
  
  // Internal updates (called by Audio Controller)
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}
```

### Component Props Interfaces

```typescript
// FullPlayer
interface FullPlayerProps {
  onMinimize: () => void
}

// MiniPlayer
interface MiniPlayerProps {
  onExpand: () => void
  onClose: () => void
}

// QueueView
interface QueueViewProps {
  queue: QuranTrack[]
  currentIndex: number
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (index: number) => void
  onSelect: (index: number) => void
}

// SleepTimer
interface SleepTimerProps {
  onSet: (minutes: number) => void
  onCancel: () => void
  onExtend: (minutes: number) => void
  activeTimer: SleepTimerState | null
}

// ProgressBar
interface ProgressBarProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  variant: 'full' | 'mini' // Different styles for different modes
}

// VolumeControl
interface VolumeControlProps {
  volume: number
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
}

// SpeedControl
interface SpeedControlProps {
  speed: number
  onSpeedChange: (speed: number) => void
}
```


## Skip Logic Implementation

### Sequential Skip (No Shuffle)

```typescript
const skipNext = () => {
  const { currentTrack, queue, currentQueueIndex, repeatMode } = get()
  
  if (!currentTrack) return
  
  // If queue exists, use queue
  if (queue.length > 0) {
    if (currentQueueIndex < queue.length - 1) {
      playTrack(queue[currentQueueIndex + 1])
      set({ currentQueueIndex: currentQueueIndex + 1 })
    } else if (repeatMode === 'REPEAT_ALL') {
      playTrack(queue[0])
      set({ currentQueue
## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I've identified the following testable properties. I've eliminated redundancy by:
- Combining persistence properties into comprehensive round-trip tests
- Consolidating validation properties for configuration
- Grouping shuffle behavior into a single comprehensive property

### Property 1: Configuration Round-Trip Preservation

*For any* valid PlayerConfig object with volume between 0-1, playback speed between 0.5-2.0, valid repeat mode (OFF, REPEAT_ONE, REPEAT_ALL), valid player mode (FULL, MINI, HIDDEN), and boolean shuffle mode, serializing to JSON then parsing back should produce an equivalent configuration object.

**Validates: Requirements 20.8**

### Property 2: Configuration Validation Rejects Invalid Values

*For any* configuration object with volume outside [0, 1] OR playback speed outside [0.5, 2.0] OR invalid repeat mode OR invalid player mode, the validator should reject it with a descriptive error message containing the field name and reason.

**Validates: Requirements 20.2, 20.3, 20.4, 20.5, 20.6**

### Property 3: Shuffle History Prevents Premature Repeats

*For any* queue of N tracks with shuffle mode enabled, when skipping through tracks, no track should be played twice until all N tracks have been played at least once.

**Validates: Requirements 8.2, 8.3**

### Property 4: State Persistence Round-Trip

*For any* valid player state with volume, playback speed, repeat mode, shuffle mode, and player mode set, saving to localStorage then loading should restore all preferences to their original values.

**Validates: Requirements 2.8, 7.7, 8.7, 9.6, 10.8, 18.1, 18.2, 18.3, 18.4, 18.5**

### Property 5: All Interactive Elements Meet Touch Target Size

*For any* interactive element (button, slider, control) in the player UI, its dimensions should be at least 44x44 pixels to meet accessibility standards.

**Validates: Requirements 1.3, 4.2, 12.8**

### Property 6: All Interactive Controls Have ARIA Labels

*For any* interactive control in the player (buttons, sliders, inputs), it should have an aria-label, aria-labelledby, or title attribute providing a text description.

**Validates: Requirements 12.1, 12.5**


## Error Handling

### Error Categories

1. **Network Errors**: Audio file fails to load due to network issues
2. **Invalid URL Errors**: Audio URL is malformed or points to non-existent resource
3. **Playback Errors**: Audio element encounters playback issues
4. **Configuration Errors**: Invalid configuration loaded from localStorage
5. **Browser Compatibility Errors**: Required APIs not supported

### Error Handling Strategy

#### Network Error Recovery

```typescript
const handleNetworkError = async (error: Error, track: QuranTrack) => {
  const maxRetries = 3
  let retryCount = 0
  
  while (retryCount < maxRetries) {
    try {
      await audioRef.current?.load()
      await audioRef.current?.play()
      store.setError(null)
      return
    } catch (e) {
      retryCount++
      if (retryCount >= maxRetries) {
        store.setError(`Failed to load ${track.title} after ${maxRetries} attempts`)
        setTimeout(() => {
          store.skipNext()
        }, 3000)
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
      }
    }
  }
}
```

#### Configuration Error Recovery

```typescript
const loadConfig = () => {
  try {
    const stored = localStorage.getItem('quran-player-config')
    if (!stored) {
      return getDefaultConfig()
    }
    
    const parsed = JSON.parse(stored)
    const validated = validateConfig(parsed)
    
    if (validated.isValid) {
      return validated.config
    } else {
      logger.warn('Invalid config loaded, using defaults:', validated.errors)
      return getDefaultConfig()
    }
  } catch (e) {
    logger.error('Failed to load config:', e)
    return getDefaultConfig()
  }
}
```


#### Graceful Degradation

```typescript
// Media Session API fallback
const initMediaSession = () => {
  if (!('mediaSession' in navigator)) {
    logger.info('Media Session API not supported, continuing without system integration')
    return
  }
  // ... setup Media Session
}

// Drag-and-drop fallback
const QueueView = () => {
  const [isDndSupported] = useState(() => {
    return 'draggable' in document.createElement('div')
  })
  
  if (isDndSupported) {
    return <DraggableQueue />
  } else {
    return <StaticQueue /> // Fallback with up/down buttons
  }
}
```

### Error Display

All errors should be displayed in a user-friendly manner with retry and dismiss options.


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property tests**: Verify universal properties across all inputs through randomization

Both approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide input space.

### Property-Based Testing Configuration

**Library Selection**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `Feature: quran-audio-player-improvements, Property {number}: {property_text}`

### Unit Testing Focus Areas

1. **Mode Transitions**: Test all valid state transitions (FULL→MINI, MINI→HIDDEN, etc.)
2. **Keyboard Shortcuts**: Test each shortcut in isolation
3. **Media Session Integration**: Test metadata updates and action handlers
4. **Repeat Modes**: Test behavior at track end for each mode
5. **Sleep Timer**: Test countdown, expiration, and fade-out
6. **Error Recovery**: Test retry logic and auto-skip
7. **RTL Layout**: Test positioning and direction in RTL mode
8. **Accessibility**: Test ARIA labels, focus management, keyboard navigation


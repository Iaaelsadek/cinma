import { PlayerMode, RepeatMode } from '../types/quran-player'

export interface PlayerConfig {
  volume: number
  playbackSpeed: number
  repeatMode: RepeatMode
  playerMode: PlayerMode
}

export interface ValidationError {
  field: string
  message: string
  value: any
}

export const DEFAULT_CONFIG: PlayerConfig = {
  volume: 0.8,
  playbackSpeed: 1.0,
  repeatMode: RepeatMode.OFF,
  playerMode: PlayerMode.HIDDEN
}

/**
 * Validates a player configuration object
 * @param config - Configuration object to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateConfig(config: any): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate volume (0-1)
  if (typeof config.volume !== 'number' || config.volume < 0 || config.volume > 1) {
    errors.push({
      field: 'volume',
      message: 'Volume must be a number between 0 and 1',
      value: config.volume
    })
  }

  // Validate playbackSpeed (0.5-2.0)
  if (typeof config.playbackSpeed !== 'number' || config.playbackSpeed < 0.5 || config.playbackSpeed > 2.0) {
    errors.push({
      field: 'playbackSpeed',
      message: 'Playback speed must be a number between 0.5 and 2.0',
      value: config.playbackSpeed
    })
  }

  // Validate repeatMode
  const validRepeatModes = [RepeatMode.OFF, RepeatMode.REPEAT_ONE, RepeatMode.REPEAT_ALL]
  if (!validRepeatModes.includes(config.repeatMode)) {
    errors.push({
      field: 'repeatMode',
      message: `Repeat mode must be one of: ${validRepeatModes.join(', ')}`,
      value: config.repeatMode
    })
  }

  // Validate playerMode
  const validPlayerModes = [PlayerMode.MINI, PlayerMode.HIDDEN]
  if (!validPlayerModes.includes(config.playerMode)) {
    errors.push({
      field: 'playerMode',
      message: `Player mode must be one of: ${validPlayerModes.join(', ')}`,
      value: config.playerMode
    })
  }

  return errors
}

/**
 * Parses a configuration object from JSON string or object
 * @param input - JSON string or object to parse
 * @returns Parsed and validated configuration, or default config if invalid
 */
export function parseConfig(input: string | any): PlayerConfig {
  try {
    // Parse JSON if string
    const config = typeof input === 'string' ? JSON.parse(input) : input

    // Validate configuration
    const errors = validateConfig(config)
    
    if (errors.length > 0) {
      console.warn('Invalid player configuration, using defaults:', errors)
      return DEFAULT_CONFIG
    }

    return {
      volume: config.volume,
      playbackSpeed: config.playbackSpeed,
      repeatMode: config.repeatMode,
      playerMode: config.playerMode
    }
  } catch (error: any) {
    console.error('Failed to parse player configuration:', error)
    return DEFAULT_CONFIG
  }
}

/**
 * Converts a configuration object to a pretty-printed JSON string
 * @param config - Configuration object to serialize
 * @returns Pretty-printed JSON string
 */
export function prettyPrintConfig(config: PlayerConfig): string {
  return JSON.stringify(config, null, 2)
}

/**
 * Loads configuration from localStorage
 * @param key - localStorage key (default: 'quran-player-config')
 * @returns Parsed configuration or default config if not found/invalid
 */
export function loadConfigFromStorage(key: string = 'quran-player-config'): PlayerConfig {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) {
      return DEFAULT_CONFIG
    }
    return parseConfig(stored)
  } catch (error: any) {
    console.error('Failed to load config from localStorage:', error)
    return DEFAULT_CONFIG
  }
}

/**
 * Saves configuration to localStorage
 * @param config - Configuration object to save
 * @param key - localStorage key (default: 'quran-player-config')
 * @returns true if successful, false otherwise
 */
export function saveConfigToStorage(config: PlayerConfig, key: string = 'quran-player-config'): boolean {
  try {
    // Validate before saving
    const errors = validateConfig(config)
    if (errors.length > 0) {
      console.error('Cannot save invalid configuration:', errors)
      return false
    }

    localStorage.setItem(key, JSON.stringify(config))
    return true
  } catch (error: any) {
    console.error('Failed to save config to localStorage:', error)
    return false
  }
}

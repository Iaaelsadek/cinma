// ✅ Null Safety Utilities

/**
 * Safe property access with default value
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] {
  return obj?.[key] ?? defaultValue
}

/**
 * Safe array access
 */
export function safeArrayAccess<T>(
  arr: T[] | null | undefined,
  index: number,
  defaultValue: T
): T {
  return arr?.[index] ?? defaultValue
}

/**
 * Safe function call
 */
export function safeCall<T, Args extends any[]>(
  fn: ((...args: Args) => T) | null | undefined,
  ...args: Args
): T | undefined {
  return fn?.(...args)
}

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: any): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Get value or throw error
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is null or undefined'
): T {
  if (isNullish(value)) {
    throw new Error(message)
  }
  return value
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(
  json: string,
  defaultValue: T
): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return defaultValue
  }
}

/**
 * Safe localStorage get
 */
export function safeLocalStorageGet(
  key: string,
  defaultValue: string = ''
): string {
  try {
    return localStorage.getItem(key) ?? defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Safe localStorage set
 */
export function safeLocalStorageSet(
  key: string,
  value: string
): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Coalesce - return first non-nullish value
 */
export function coalesce<T>(...values: (T | null | undefined)[]): T | undefined {
  return values.find(isDefined)
}

/**
 * Safe number conversion
 */
export function safeNumber(
  value: any,
  defaultValue: number = 0
): number {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

/**
 * Safe string conversion
 */
export function safeString(
  value: any,
  defaultValue: string = ''
): string {
  return String(value ?? defaultValue)
}

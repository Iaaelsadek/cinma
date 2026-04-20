// ✅ Async Error Handling Utilities

/**
 * Wrap async function with error handling
 */
export function asyncHandler<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>
) {
  return async (...args: Args): Promise<T | null> => {
    try {
      return await fn(...args)
    } catch (error: any) {
      return null
    }
  }
}

/**
 * Retry async function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    delay?: number
    backoff?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    onRetry,
  } = options

  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error as Error
      
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(backoff, attempt)
        onRetry?.(attempt + 1, lastError)
        await sleep(waitTime)
      }
    }
  }

  throw lastError!
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error('Operation timed out')
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(timeoutError), timeoutMs)
    ),
  ])
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Debounce async function
 */
export function debounceAsync<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  delay: number
) {
  let timeoutId: NodeJS.Timeout | null = null
  let pendingPromise: Promise<T> | null = null

  return (...args: Args): Promise<T> => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    if (pendingPromise) {
      return pendingPromise
    }

    pendingPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args)
          resolve(result)
        } catch (error: any) {
          reject(error)
        } finally {
          pendingPromise = null
          timeoutId = null
        }
      }, delay)
    })

    return pendingPromise
  }
}

/**
 * Throttle async function
 */
export function throttleAsync<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  delay: number
) {
  let lastCall = 0
  let pendingPromise: Promise<T> | null = null

  return async (...args: Args): Promise<T> => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    if (timeSinceLastCall < delay && pendingPromise) {
      return pendingPromise
    }

    lastCall = now
    pendingPromise = fn(...args)

    try {
      return await pendingPromise
    } finally {
      pendingPromise = null
    }
  }
}

/**
 * Run promises in parallel with limit
 */
export async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = []
  const executing: Promise<void>[] = []

  for (const task of tasks) {
    const promise = task().then(result => {
      results.push(result)
    })

    executing.push(promise)

    if (executing.length >= limit) {
      await Promise.race(executing)
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      )
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * Safe Promise.all with error handling
 */
export async function safePromiseAll<T>(
  promises: Promise<T>[]
): Promise<(T | Error)[]> {
  return Promise.all(
    promises.map(p =>
      p.catch(error => error as Error)
    )
  )
}

/**
 * Batch async operations
 */
export async function batchAsync<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await processor(batch)
    results.push(...batchResults)
  }

  return results
}

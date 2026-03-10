/**
 * Utility for safely reading environment variables during runtime or tests.
 *
 * This is separated from `constants.ts` so that the function itself can be
 * tested without pulling in any `import.meta` usage from the larger file.
 */

export function envVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

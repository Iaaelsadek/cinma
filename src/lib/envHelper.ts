/**
 * Utility for safely reading environment variables during runtime or tests.
 *
 * This is separated from `constants.ts` so that the function itself can be
 * tested without pulling in any `import.meta` usage from the larger file.
 */

export function envVar(key: string): string | undefined {
  // try process.env first
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // fallback to import.meta.env via eval to avoid TS parsing errors
  try {
    // eslint-disable-next-line no-eval
    const meta = eval('import.meta');
    return meta?.env?.[key];
  } catch {
    return undefined;
  }
}

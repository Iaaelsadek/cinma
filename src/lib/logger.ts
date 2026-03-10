type LogArgs = unknown[]

import { envVar } from './envHelper';

// determine production flag safely (Jest doesn't support import.meta)
const isProd = (() => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return true;
  }
  // check Vite-generated variable or runtime config via helper
  try {
    return envVar('PROD') === 'true' || envVar('VITE_PROD') === 'true';
  } catch {
    return false;
  }
})();

const verboseEnabled = (() => {
  if (!isProd) return true;
  if (typeof process !== 'undefined' && process.env.VITE_ENABLE_VERBOSE_LOGS === 'true') return true;
  try {
    return envVar('VITE_ENABLE_VERBOSE_LOGS') === 'true';
  } catch {
    return false;
  }
})();

const write = (method: 'log' | 'warn' | 'error', ...args: LogArgs) => {
  console[method](...args)
}

export const logger = {
  debug: (...args: LogArgs) => {
    if (!verboseEnabled) return
    write('log', ...args)
  },
  info: (...args: LogArgs) => {
    if (!verboseEnabled) return
    write('log', ...args)
  },
  warn: (...args: LogArgs) => {
    write('warn', ...args)
  },
  error: (...args: LogArgs) => {
    write('error', ...args)
  }
}

type LogArgs = unknown[]

const isProd = import.meta.env.PROD
const verboseEnabled = !isProd || import.meta.env.VITE_ENABLE_VERBOSE_LOGS === 'true'

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

/**
 * Development-only logging utilities
 * These functions only log in development mode to keep production clean
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args)
  },
}

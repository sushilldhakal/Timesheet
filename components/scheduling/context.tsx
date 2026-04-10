/**
 * context.tsx — re-exports the unified scheduler context from the shell module.
 *
 * This provides a centralized context for all scheduler components.
 */
export {
  SchedulerContext,
  SchedulerProvider,
  useSchedulerContext,
} from './shell/SchedulerProvider'
export type { SchedulerProviderProps } from './shell/SchedulerProvider'
export type {
  SchedulerContextValue,
} from './shell/types'

/**
 * nextUid — generates a unique block ID.
 * Uses crypto.randomUUID() when available (all modern browsers + Node 18+),
 * falling back to Math.random() for older envs.
 */
export function nextUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `s${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
  }
  return `s${Math.random().toString(36).slice(2, 14)}`
}

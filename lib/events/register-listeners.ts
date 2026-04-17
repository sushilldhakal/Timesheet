import { registerNotificationListeners } from './listeners/notification-listener'
import { registerComplianceListeners } from './listeners/compliance-listener'
import { logEventMetric, logSlowListener } from '@/lib/observability/event-logger'
import { eventBus } from './event-bus'

const REGISTERED_KEY = '__timesheet_listeners_registered__'
declare global {
  // eslint-disable-next-line no-var
  var __timesheet_listeners_registered__: boolean | undefined
}

/**
 * Register all domain event listeners.
 * Safe to call multiple times — the globalThis guard prevents double-registration
 * across Next.js hot reloads and multiple imports.
 */
export function registerAllListeners(): void {
  if (globalThis[REGISTERED_KEY]) return
  ;(globalThis as any)[REGISTERED_KEY] = true

  // Attach observability hook FIRST so all listeners are instrumented
  eventBus.setObservabilityHook((eventType, durationMs, listenerName, success, error) => {
    const metric = {
      eventType,
      listenerName,
      durationMs,
      success,
      errorMessage: error instanceof Error ? error.message : undefined,
      timestamp: new Date().toISOString(),
    }
    logEventMetric(metric)
    logSlowListener(metric)
  })

  registerNotificationListeners()
  registerComplianceListeners()
}

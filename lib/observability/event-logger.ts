export interface EventMetric {
  eventType: string
  listenerName: string
  tenantId?: string
  durationMs: number
  success: boolean
  errorMessage?: string
  timestamp: string
}

/**
 * Structured logger for event bus activity.
 * Outputs JSON lines — works with Datadog, Logtail, Vercel log drains, etc.
 */
export function logEventMetric(metric: EventMetric): void {
  const level = metric.success ? 'info' : 'error'
  console[level](
    JSON.stringify({
      type: 'event_bus_metric',
      ...metric,
    })
  )
}

/**
 * Log a slow listener warning. Threshold: 2000ms.
 */
export function logSlowListener(metric: EventMetric): void {
  if (metric.durationMs > 2000) {
    console.warn(
      JSON.stringify({
        type: 'event_bus_slow_listener',
        ...metric,
        warning: `Listener took ${metric.durationMs}ms — consider making it async/non-blocking`,
      })
    )
  }
}

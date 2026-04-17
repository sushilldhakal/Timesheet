import { randomUUID } from 'crypto'
import type { AnyDomainEvent, DomainEventType } from './domain-events'

type EventListener<T extends AnyDomainEvent = AnyDomainEvent> = (event: T) => Promise<void>

type ObservabilityHook = (
  eventType: string,
  durationMs: number,
  listenerName: string,
  success: boolean,
  error?: unknown
) => void

class EventBus {
  private listeners = new Map<DomainEventType, Array<{ name: string; fn: EventListener }>>()
  private observabilityHook?: ObservabilityHook

  /** Register a named listener for a specific event type. */
  on<T extends AnyDomainEvent>(
    eventType: T['eventType'],
    listener: EventListener<T>,
    name?: string
  ): void {
    const key = eventType as DomainEventType
    const existing = this.listeners.get(key) ?? []
    this.listeners.set(key, [
      ...existing,
      { name: name ?? listener.name ?? 'anonymous', fn: listener as EventListener },
    ])
  }

  /** Attach an observability hook (called after each listener, success or failure). */
  setObservabilityHook(hook: ObservabilityHook): void {
    this.observabilityHook = hook
  }

  /**
   * Emit a domain event.
   * 1. Assigns a UUID eventId if not provided
   * 2. Inserts to DomainEventLog (idempotent — duplicate eventId is silently ignored)
   * 3. Runs all registered listeners concurrently with timing
   * 4. Marks event as processedAt if all succeed; records failedListeners if any fail
   *
   * Never throws — errors are captured and logged.
   */
  async emit(event: AnyDomainEvent): Promise<void> {
    const eventId = event.eventId ?? randomUUID()
    const occurredAt = event.occurredAt ?? new Date()

    // 1. Persist to outbox (idempotent via unique eventId index)
    let logDocId: string | null = null
    try {
      const { DomainEventLog } = await import('@/lib/db/schemas/domain-event-log')
      const doc = await DomainEventLog.findOneAndUpdate(
        { eventId },
        {
          $setOnInsert: {
            eventId,
            tenantId: event.tenantId,
            eventType: event.eventType,
            entityId: event.entityId,
            entityType: event.entityType,
            actorId: event.actorId,
            payload: (event as any).payload ?? {},
            occurredAt,
            failedListeners: [],
            retryCount: 0,
          },
        },
        { upsert: true, new: true }
      )
      logDocId = doc?._id?.toString() ?? null

      // Already fully processed — skip listeners (idempotency)
      if (doc?.processedAt) return
    } catch (err) {
      console.error('[EventBus] Failed to persist event:', event.eventType, err)
      // Continue to run listeners even if DB write failed — best-effort
    }

    // 2. Run listeners concurrently, track failures
    const handlers = this.listeners.get(event.eventType as DomainEventType) ?? []
    const failedListeners: string[] = []

    await Promise.allSettled(
      handlers.map(async ({ name, fn }) => {
        const start = Date.now()
        try {
          await fn(event)
          this.observabilityHook?.(event.eventType, Date.now() - start, name, true)
        } catch (err) {
          failedListeners.push(name)
          this.observabilityHook?.(event.eventType, Date.now() - start, name, false, err)
          console.error(`[EventBus] Listener "${name}" failed for ${event.eventType}:`, err)
        }
      })
    )

    // 3. Update DomainEventLog — mark processed or record failures
    if (logDocId) {
      try {
        const { DomainEventLog } = await import('@/lib/db/schemas/domain-event-log')
        if (failedListeners.length === 0) {
          await DomainEventLog.updateOne({ _id: logDocId }, { $set: { processedAt: new Date() } })
        } else {
          await DomainEventLog.updateOne(
            { _id: logDocId },
            { $set: { failedListeners }, $inc: { retryCount: 1 } }
          )
          const doc = await DomainEventLog.findById(logDocId).select('retryCount').lean()
          const backoffMs = Math.pow(2, doc?.retryCount ?? 1) * 30_000
          await DomainEventLog.updateOne(
            { _id: logDocId },
            { $set: { nextRetryAt: new Date(Date.now() + backoffMs) } }
          )
        }
      } catch (err) {
        console.error('[EventBus] Failed to update event log after dispatch:', err)
      }
    }
  }

  /**
   * Replay a single DomainEventLog document — re-runs only its failedListeners.
   * Called by the startup sweep and the retry cron job.
   */
  async replayFailedListeners(logDoc: {
    _id: string
    eventType: string
    payload: Record<string, unknown>
    tenantId: string
    entityId: string
    entityType: string
    actorId?: string
    failedListeners: string[]
    retryCount: number
  }): Promise<void> {
    const handlers = this.listeners.get(logDoc.eventType as DomainEventType) ?? []
    const targetHandlers = handlers.filter((h) => logDoc.failedListeners.includes(h.name))
    if (targetHandlers.length === 0) return

    const stillFailed: string[] = []
    const event = {
      eventType: logDoc.eventType,
      tenantId: logDoc.tenantId,
      entityId: logDoc.entityId,
      entityType: logDoc.entityType,
      actorId: logDoc.actorId,
      occurredAt: new Date(),
      payload: logDoc.payload,
    } as AnyDomainEvent

    await Promise.allSettled(
      targetHandlers.map(async ({ name, fn }) => {
        try {
          await fn(event)
        } catch {
          stillFailed.push(name)
        }
      })
    )

    const { DomainEventLog } = await import('@/lib/db/schemas/domain-event-log')
    if (stillFailed.length === 0) {
      await DomainEventLog.updateOne(
        { _id: logDoc._id },
        { $set: { processedAt: new Date(), failedListeners: [] } }
      )
    } else {
      const MAX_RETRIES = 5
      const retryCount = logDoc.retryCount + 1
      const backoffMs = Math.min(Math.pow(2, retryCount) * 30_000, 60 * 60_000) // cap 1h
      await DomainEventLog.updateOne(
        { _id: logDoc._id },
        {
          $set: {
            failedListeners: stillFailed,
            retryCount,
            nextRetryAt: retryCount >= MAX_RETRIES ? null : new Date(Date.now() + backoffMs),
          },
        }
      )
    }
  }

  _reset(): void {
    this.listeners.clear()
  }
}

// ─── globalThis singleton guard ───────────────────────────────────────────────
// Next.js hot-reloads modules but shares globalThis across reloads.
// This prevents duplicate listeners accumulating during development AND
// ensures a single bus instance per Node.js worker process in production.
const GLOBAL_KEY = '__timesheet_event_bus__'
declare global {
  // eslint-disable-next-line no-var
  var __timesheet_event_bus__: EventBus | undefined
}

export const eventBus: EventBus =
  (globalThis[GLOBAL_KEY] as EventBus | undefined) ??
  (() => {
    const bus = new EventBus()
    ;(globalThis as any)[GLOBAL_KEY] = bus
    return bus
  })()

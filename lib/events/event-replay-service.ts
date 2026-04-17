import { DomainEventLog } from '@/lib/db/schemas/domain-event-log'
import { eventBus } from './event-bus'

export const eventReplayService = {
  /**
   * Sweep for events that have failed listeners and are due for retry.
   * Safe to call on every app startup and from a cron job.
   */
  async retryFailedListeners(options?: {
    tenantId?: string
    limit?: number
  }): Promise<{ found: number; retried: number; resolved: number }> {
    const query: Record<string, unknown> = {
      processedAt: { $exists: false },
      failedListeners: { $exists: true, $not: { $size: 0 } },
      retryCount: { $lt: 5 },
      $or: [
        { nextRetryAt: { $exists: false } },
        { nextRetryAt: { $lte: new Date() } },
      ],
    }
    if (options?.tenantId) query.tenantId = options.tenantId

    const docs = await DomainEventLog.find(query)
      .limit(options?.limit ?? 50)
      .lean()

    let retried = 0
    let resolved = 0

    for (const doc of docs) {
      try {
        await eventBus.replayFailedListeners({
          _id: doc._id.toString(),
          eventType: doc.eventType,
          payload: doc.payload as Record<string, unknown>,
          tenantId: doc.tenantId.toString(),
          entityId: doc.entityId,
          entityType: doc.entityType,
          actorId: doc.actorId,
          failedListeners: doc.failedListeners,
          retryCount: doc.retryCount,
        })
        retried++

        const updated = await DomainEventLog.findById(doc._id).select('processedAt').lean()
        if (updated?.processedAt) resolved++
      } catch (err) {
        console.error('[EventReplay] Retry failed for event:', doc._id, err)
      }
    }

    return { found: docs.length, retried, resolved }
  },
}

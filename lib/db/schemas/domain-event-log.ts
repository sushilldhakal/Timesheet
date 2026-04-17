import mongoose from 'mongoose'
import type { DomainEventType } from '@/lib/events/domain-events'

export interface IDomainEventLog {
  _id: mongoose.Types.ObjectId
  eventId: string              // UUID — unique per emission, used for deduplication
  tenantId: mongoose.Types.ObjectId
  eventType: DomainEventType
  entityId: string
  entityType: string
  actorId?: string
  payload: Record<string, unknown>
  occurredAt: Date
  processedAt?: Date           // set AFTER all listeners complete successfully
  failedListeners: string[]    // listener names that threw — populated for retry
  retryCount: number
  nextRetryAt?: Date           // if set, don't retry before this time
  createdAt: Date
}

export interface IDomainEventLogDocument extends IDomainEventLog, mongoose.Document {}

const schema = new mongoose.Schema<IDomainEventLogDocument>(
  {
    eventId:         { type: String, required: true },
    tenantId:        { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    eventType:       { type: String, required: true, index: true },
    entityId:        { type: String, required: true },
    entityType:      { type: String, required: true },
    actorId:         { type: String },
    payload:         { type: mongoose.Schema.Types.Mixed, required: true },
    occurredAt:      { type: Date, required: true, default: () => new Date() },
    processedAt:     { type: Date },
    failedListeners: [{ type: String }],
    retryCount:      { type: Number, default: 0 },
    nextRetryAt:     { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'domain_event_log' }
)

// Idempotency index — prevents duplicate event insertions
schema.index({ eventId: 1 }, { unique: true })
// Replay query: all unprocessed events (startup sweep)
schema.index({ processedAt: 1, nextRetryAt: 1 })
// Standard query patterns
schema.index({ tenantId: 1, eventType: 1, occurredAt: -1 })
schema.index({ tenantId: 1, entityId: 1, entityType: 1, occurredAt: 1 })

export const DomainEventLog =
  (mongoose.models.DomainEventLog as mongoose.Model<IDomainEventLogDocument>) ??
  mongoose.model<IDomainEventLogDocument>('DomainEventLog', schema)

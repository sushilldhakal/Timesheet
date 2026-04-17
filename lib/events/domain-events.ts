import { randomUUID } from 'crypto'

export const DOMAIN_EVENTS = {
  SHIFT_CREATED:        'shift.created',
  SHIFT_UPDATED:        'shift.updated',
  SHIFT_DELETED:        'shift.deleted',
  ROSTER_PUBLISHED:     'roster.published',
  ROSTER_UNPUBLISHED:   'roster.unpublished',
  CLOCK_IN:             'clock.in',
  CLOCK_OUT:            'clock.out',
  SHIFT_SWAP_REQUESTED: 'shift_swap.requested',
  SHIFT_SWAP_APPROVED:  'shift_swap.approved',
  SHIFT_SWAP_REJECTED:  'shift_swap.rejected',
  PAYRUN_CALCULATED:    'payrun.calculated',
  PAYRUN_APPROVED:      'payrun.approved',
  COMPLIANCE_VIOLATED:  'compliance.violated',
  COMPLIANCE_RESOLVED:  'compliance.resolved',
  BREAK_MISSED:         'break.missed',
} as const

export type DomainEventType = typeof DOMAIN_EVENTS[keyof typeof DOMAIN_EVENTS]

export interface BaseDomainEvent {
  eventType: DomainEventType
  tenantId: string
  occurredAt: Date
  entityId: string
  entityType: string
  actorId?: string
  /** UUID — caller provides this to enable idempotency. Auto-generated if omitted. */
  eventId?: string
}

export interface ShiftCreatedEvent extends BaseDomainEvent {
  eventType: 'shift.created'
  payload: { shiftId: string; employeeId: string; locationId: string; start: Date; end: Date }
}

export interface ShiftUpdatedEvent extends BaseDomainEvent {
  eventType: 'shift.updated'
  payload: { shiftId: string; employeeId: string; changes: Record<string, unknown> }
}

export interface ShiftDeletedEvent extends BaseDomainEvent {
  eventType: 'shift.deleted'
  payload: { shiftId: string; employeeId: string }
}

export interface RosterPublishedEvent extends BaseDomainEvent {
  eventType: 'roster.published'
  payload: { weekId: string; locationId: string; employeeIds: string[]; shiftCount: number }
}

export interface ClockInEvent extends BaseDomainEvent {
  eventType: 'clock.in'
  payload: { sessionId: string; employeeId: string; deviceId: string; locationId: string; clockedInAt: Date }
}

export interface ClockOutEvent extends BaseDomainEvent {
  eventType: 'clock.out'
  payload: { sessionId: string; employeeId: string; totalMinutes: number; breakMinutes: number; clockedOutAt: Date }
}

export interface ShiftSwapRequestedEvent extends BaseDomainEvent {
  eventType: 'shift_swap.requested'
  payload: { swapId: string; requestorId: string; targetId: string; shiftId: string }
}

export interface ShiftSwapApprovedEvent extends BaseDomainEvent {
  eventType: 'shift_swap.approved'
  payload: { swapId: string; requestorId: string; approvedBy: string }
}

export interface ShiftSwapRejectedEvent extends BaseDomainEvent {
  eventType: 'shift_swap.rejected'
  payload: { swapId: string; requestorId: string; rejectedBy: string }
}

export interface PayRunCalculatedEvent extends BaseDomainEvent {
  eventType: 'payrun.calculated'
  payload: { payRunId: string; periodStart: Date; periodEnd: Date; totalGross: number; employeeCount: number }
}

export interface PayRunApprovedEvent extends BaseDomainEvent {
  eventType: 'payrun.approved'
  payload: { payRunId: string; approvedBy: string }
}

export interface ComplianceViolatedEvent extends BaseDomainEvent {
  eventType: 'compliance.violated'
  payload: { violationId: string; employeeId: string; ruleType: string; severity: 'warning' | 'breach' }
}

export interface ComplianceResolvedEvent extends BaseDomainEvent {
  eventType: 'compliance.resolved'
  payload: { violationId: string; employeeId: string; resolvedBy: string }
}

export interface BreakMissedEvent extends BaseDomainEvent {
  eventType: 'break.missed'
  payload: { shiftId: string; employeeId: string; requiredMinutes: number; actualMinutes: number }
}

export type AnyDomainEvent =
  | ShiftCreatedEvent
  | ShiftUpdatedEvent
  | ShiftDeletedEvent
  | RosterPublishedEvent
  | ClockInEvent
  | ClockOutEvent
  | ShiftSwapRequestedEvent
  | ShiftSwapApprovedEvent
  | ShiftSwapRejectedEvent
  | PayRunCalculatedEvent
  | PayRunApprovedEvent
  | ComplianceViolatedEvent
  | ComplianceResolvedEvent
  | BreakMissedEvent

/**
 * Generate a stable eventId for a given entity+action combination.
 * scopeToHour=true: dedupes within the same hour (e.g. double-tap on publish).
 * scopeToHour=false: always unique (default).
 */
export function makeEventId(eventType: string, entityId: string, scopeToHour = false): string {
  if (scopeToHour) {
    const hour = new Date().toISOString().slice(0, 13) // "2025-04-17T14"
    return `${eventType}:${entityId}:${hour}`
  }
  return randomUUID()
}

import { eventBus } from '@/lib/events/event-bus'
import {
  DOMAIN_EVENTS,
  type RosterPublishedEvent,
  type ShiftSwapApprovedEvent,
  type ShiftSwapRejectedEvent,
  type ShiftSwapRequestedEvent,
  type ComplianceViolatedEvent,
  type BreakMissedEvent,
  type PayRunCalculatedEvent,
} from '@/lib/events/domain-events'

export function registerNotificationListeners(): void {
  eventBus.on<RosterPublishedEvent>(
    DOMAIN_EVENTS.ROSTER_PUBLISHED,
    async (event) => {
      const { notificationService } = await import('@/lib/services/notifications/notification-service')
      await Promise.allSettled(
        event.payload.employeeIds.map((empId) =>
          notificationService.send(
            { type: 'full', sub: event.actorId ?? 'system', email: '', role: 'admin', tenantId: event.tenantId, locations: [], managedRoles: [] },
            {
              targetType: 'employee',
              targetId: empId,
              category: 'roster_published',
              title: 'New Roster Published',
              message: `Your roster for week ${event.payload.weekId} has been published.`,
              relatedEntity: { type: 'roster', id: event.entityId },
              channels: ['in_app'],
            }
          )
        )
      )
    },
    'notification:roster_published'
  )

  eventBus.on<ShiftSwapRequestedEvent>(
    DOMAIN_EVENTS.SHIFT_SWAP_REQUESTED,
    async (event) => {
      const { notificationService } = await import('@/lib/services/notifications/notification-service')
      await notificationService.send(
        { type: 'full', sub: event.actorId ?? 'system', email: '', role: 'admin', tenantId: event.tenantId, locations: [], managedRoles: [] },
        {
          targetType: 'employee',
          targetId: event.payload.targetId,
          category: 'shift_swap_request',
          title: 'Shift Swap Request',
          message: 'You have a new shift swap request.',
          relatedEntity: { type: 'shift_swap', id: event.payload.swapId },
          channels: ['in_app'],
        }
      )
    },
    'notification:shift_swap_requested'
  )

  eventBus.on<ShiftSwapApprovedEvent>(
    DOMAIN_EVENTS.SHIFT_SWAP_APPROVED,
    async (event) => {
      const { notificationService } = await import('@/lib/services/notifications/notification-service')
      await notificationService.send(
        { type: 'full', sub: event.actorId ?? 'system', email: '', role: 'admin', tenantId: event.tenantId, locations: [], managedRoles: [] },
        {
          targetType: 'employee',
          targetId: event.payload.requestorId,
          category: 'shift_swap_approved',
          title: 'Shift Swap Approved',
          message: 'Your shift swap request has been approved.',
          relatedEntity: { type: 'shift_swap', id: event.payload.swapId },
          channels: ['in_app'],
        }
      )
    },
    'notification:shift_swap_approved'
  )

  eventBus.on<ShiftSwapRejectedEvent>(
    DOMAIN_EVENTS.SHIFT_SWAP_REJECTED,
    async (event) => {
      const { notificationService } = await import('@/lib/services/notifications/notification-service')
      await notificationService.send(
        { type: 'full', sub: event.actorId ?? 'system', email: '', role: 'admin', tenantId: event.tenantId, locations: [], managedRoles: [] },
        {
          targetType: 'employee',
          targetId: event.payload.requestorId,
          category: 'shift_swap_denied',
          title: 'Shift Swap Denied',
          message: 'Your shift swap request was not approved.',
          relatedEntity: { type: 'shift_swap', id: event.payload.swapId },
          channels: ['in_app'],
        }
      )
    },
    'notification:shift_swap_rejected'
  )

  eventBus.on<ComplianceViolatedEvent>(
    DOMAIN_EVENTS.COMPLIANCE_VIOLATED,
    async (event) => {
      if (!event.actorId) return
      const { notificationService } = await import('@/lib/services/notifications/notification-service')
      await notificationService.send(
        { type: 'full', sub: event.actorId, email: '', role: 'admin', tenantId: event.tenantId, locations: [], managedRoles: [] },
        {
          targetType: 'user',
          targetId: event.actorId,
          category: 'compliance_breach',
          title: 'Compliance Violation Detected',
          message: `A ${event.payload.severity} compliance issue was detected (${event.payload.ruleType}).`,
          relatedEntity: { type: 'compliance_violation', id: event.payload.violationId },
          channels: ['in_app'],
        }
      )
    },
    'notification:compliance_violated'
  )

  eventBus.on<BreakMissedEvent>(
    DOMAIN_EVENTS.BREAK_MISSED,
    async (event) => {
      const { notificationService } = await import('@/lib/services/notifications/notification-service')
      await notificationService.send(
        { type: 'full', sub: 'system', email: '', role: 'admin', tenantId: event.tenantId, locations: [], managedRoles: [] },
        {
          targetType: 'employee',
          targetId: event.payload.employeeId,
          category: 'system',
          title: 'Break Not Recorded',
          message: `Your shift required a ${event.payload.requiredMinutes}min break but only ${event.payload.actualMinutes}min was recorded.`,
          relatedEntity: { type: 'shift', id: event.payload.shiftId },
          channels: ['in_app'],
        }
      )
    },
    'notification:break_missed'
  )

  eventBus.on<PayRunCalculatedEvent>(
    DOMAIN_EVENTS.PAYRUN_CALCULATED,
    async (event) => {
      if (!event.actorId) return
      const { notificationService } = await import('@/lib/services/notifications/notification-service')
      await notificationService.send(
        { type: 'full', sub: event.actorId, email: '', role: 'admin', tenantId: event.tenantId, locations: [], managedRoles: [] },
        {
          targetType: 'user',
          targetId: event.actorId,
          category: 'pay_run_ready',
          title: 'Pay Run Calculated',
          message: `Pay run for ${event.payload.employeeCount} employees is ready for review.`,
          relatedEntity: { type: 'pay_run', id: event.payload.payRunId },
          channels: ['in_app'],
        }
      )
    },
    'notification:payrun_calculated'
  )
}

import { eventBus } from '@/lib/events/event-bus'
import {
  DOMAIN_EVENTS,
  type ShiftCreatedEvent,
  type ShiftUpdatedEvent,
  type ClockOutEvent,
} from '@/lib/events/domain-events'

const LONG_SHIFT_MINUTES = 300  // 5 hours
const MIN_BREAK_MINUTES = 20

export function registerComplianceListeners(): void {
  eventBus.on<ShiftCreatedEvent>(
    DOMAIN_EVENTS.SHIFT_CREATED,
    async (event) => {
      const { complianceService } = await import('@/lib/services/compliance/compliance-service')
      const ctx = {
        type: 'full' as const,
        sub: event.actorId ?? 'system',
        email: '',
        role: 'admin',
        tenantId: event.tenantId,
        locations: [],
        managedRoles: [],
      }
      await complianceService.evaluateShift(
        ctx,
        event.payload.employeeId,
        {
          employeeId: event.payload.employeeId,
          shiftStart: event.payload.start,
          shiftEnd: event.payload.end,
          shiftId: event.entityId,
          breakMinutes: 0,
        },
        { persist: true }
      )
    },
    'compliance:shift_created'
  )

  eventBus.on<ShiftUpdatedEvent>(
    DOMAIN_EVENTS.SHIFT_UPDATED,
    async (event) => {
      const { complianceService } = await import('@/lib/services/compliance/compliance-service')
      const ctx = {
        type: 'full' as const,
        sub: event.actorId ?? 'system',
        email: '',
        role: 'admin',
        tenantId: event.tenantId,
        locations: [],
        managedRoles: [],
      }
      // Re-evaluate the employee's compliance after the shift change
      const now = new Date()
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      await complianceService.evaluateEmployee(ctx, event.payload.employeeId, twoWeeksAgo, now)
    },
    'compliance:shift_updated'
  )

  eventBus.on<ClockOutEvent>(
    DOMAIN_EVENTS.CLOCK_OUT,
    async (event) => {
      // Emit break.missed if shift was long but break was short
      if (
        event.payload.totalMinutes > LONG_SHIFT_MINUTES &&
        event.payload.breakMinutes < MIN_BREAK_MINUTES
      ) {
        await eventBus.emit({
          eventType: DOMAIN_EVENTS.BREAK_MISSED,
          tenantId: event.tenantId,
          entityId: event.entityId,
          entityType: 'clock_session',
          actorId: event.actorId,
          occurredAt: new Date(),
          payload: {
            shiftId: event.entityId,
            employeeId: event.payload.employeeId,
            requiredMinutes: 30,
            actualMinutes: event.payload.breakMinutes,
          },
        })
      }
    },
    'compliance:clock_out_break_check'
  )
}

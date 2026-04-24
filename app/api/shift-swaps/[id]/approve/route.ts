import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  shiftSwapIdParamSchema,
  approveShiftSwapSchema,
  shiftSwapRequestResponseSchema,
} from "@/lib/validations/shift-swaps"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { shiftSwapService } from "@/lib/services/shift-swap/shift-swap-service"
import { getTenantContext } from "@/lib/auth/tenant-context"
import { eventBus } from "@/lib/events/event-bus"
import { DOMAIN_EVENTS, makeEventId } from "@/lib/events/domain-events"

/**
 * PATCH /api/shift-swaps/[id]/approve
 * Manager approves a shift swap request
 */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/shift-swaps/{id}/approve',
  summary: 'Approve shift swap request',
  description: 'Manager approves a shift swap request',
  tags: ['ShiftSwaps'],
  security: 'adminAuth',
  request: {
    params: shiftSwapIdParamSchema,
    body: approveShiftSwapSchema,
  },
  responses: {
    200: shiftSwapRequestResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { id } = params!
    const result = await shiftSwapService.approve(id, body)

    // Emit domain event
    const tenantCtx = await getTenantContext()
    if (tenantCtx && tenantCtx.type === "full" && (result as any)?.shiftSwap?.requestorEmployeeId) {
      const swap = (result as any).shiftSwap
      const requestorId = swap.requestorEmployeeId.toString()

      eventBus.emit({
        eventType: DOMAIN_EVENTS.SHIFT_SWAP_APPROVED,
        tenantId: tenantCtx.tenantId,
        entityId: id,
        entityType: 'shift_swap',
        actorId: ctx.auth.sub,
        occurredAt: new Date(),
        eventId: makeEventId(DOMAIN_EVENTS.SHIFT_SWAP_APPROVED, id),
        payload: { swapId: id, requestorId, approvedBy: ctx.auth.sub },
      }).catch(() => {})
    }

    return { status: 200, data: result }
  }
})
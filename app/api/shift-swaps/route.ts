import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  shiftSwapQuerySchema,
  createShiftSwapSchema,
  shiftSwapRequestsResponseSchema,
  shiftSwapRequestResponseSchema,
} from "@/lib/validations/shift-swaps"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { shiftSwapService } from "@/lib/services/shift-swap/shift-swap-service"
import { notificationService } from "@/lib/services/notifications/notification-service"
import { getTenantContext } from "@/lib/auth/tenant-context"
import { eventBus } from "@/lib/events/event-bus"
import { DOMAIN_EVENTS, makeEventId } from "@/lib/events/domain-events"

/**
 * GET /api/shift-swaps?status=...&employeeId=...
 * List shift swap requests
 */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/shift-swaps',
  summary: 'List shift swap requests',
  description: 'Get a list of shift swap requests with optional filtering',
  tags: ['ShiftSwaps'],
  security: 'adminAuth',
  request: {
    query: shiftSwapQuerySchema,
  },
  responses: {
    200: shiftSwapRequestsResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { status, employeeId } = query || {}

    return { status: 200, data: await shiftSwapService.list(status as any, employeeId) }
  }
})

/**
 * POST /api/shift-swaps
 * Create a new shift swap request
 */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/shift-swaps',
  summary: 'Create shift swap request',
  description: 'Create a new shift swap request',
  tags: ['ShiftSwaps'],
  security: 'adminAuth',
  request: {
    body: createShiftSwapSchema,
  },
  responses: {
    201: shiftSwapRequestResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const result = await shiftSwapService.create(body)

    // NEW: emit domain event + DUAL_WRITE_DEPRECATED direct notify (remove after 2025-07-01)
    const tenantCtx = await getTenantContext()
    if (tenantCtx && tenantCtx.type === "full" && (result as any)?.shiftSwap?.targetEmployeeId) {
      const swap = (result as any).shiftSwap
      const swapId = swap._id?.toString() ?? ""
      const targetId = swap.targetEmployeeId.toString()
      const requestorId = swap.requestorEmployeeId?.toString() ?? ctx.auth.sub

      eventBus.emit({
        eventType: DOMAIN_EVENTS.SHIFT_SWAP_REQUESTED,
        tenantId: tenantCtx.tenantId,
        entityId: swapId,
        entityType: 'shift_swap',
        actorId: ctx.auth.sub,
        occurredAt: new Date(),
        eventId: makeEventId(DOMAIN_EVENTS.SHIFT_SWAP_REQUESTED, swapId),
        payload: { swapId, requestorId, targetId, shiftId: swap.shiftId?.toString() ?? "" },
      }).catch(() => {})

      // DUAL_WRITE_DEPRECATED: remove after 2025-07-01
      notificationService
        .send(tenantCtx, {
          targetType: "employee",
          targetId,
          category: "shift_swap_request",
          title: "Shift Swap Request",
          message: "You have received a shift swap request.",
          relatedEntity: { type: "shift_swap", id: swapId },
          channels: ["in_app"],
        })
        .catch(() => {})
    }

    return { status: 201, data: result }
  }
})
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  shiftSwapQuerySchema,
  createShiftSwapSchema,
  shiftSwapRequestsResponseSchema,
  shiftSwapRequestResponseSchema,
} from "@/lib/validations/shift-swaps"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { getAuthWithUserLocations } = await import("@/lib/auth/auth-api")
    const { connectDB } = await import("@/lib/db")
    const { ShiftSwapManager } = await import("@/lib/managers/shift-swap-manager")

    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { status, employeeId } = query || {}

    try {
      await connectDB()
      const shiftSwapManager = new ShiftSwapManager()
      const swapRequests = await shiftSwapManager.getSwapRequests(status as any, employeeId)

      return { status: 200, data: { swapRequests } }
    } catch (err) {
      console.error("[api/shift-swaps GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch swap requests" }
      }
    }
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
    const { getAuthWithUserLocations } = await import("@/lib/auth/auth-api")
    const { connectDB } = await import("@/lib/db")
    const { ShiftSwapManager } = await import("@/lib/managers/shift-swap-manager")

    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { requestorId, recipientId, shiftAssignmentId, reason } = body!

    try {
      await connectDB()
      const shiftSwapManager = new ShiftSwapManager()
      const swapRequest = await shiftSwapManager.createSwapRequest(
        requestorId,
        recipientId,
        shiftAssignmentId,
        reason
      )

      return { status: 201, data: { swapRequest } }
    } catch (err) {
      console.error("[api/shift-swaps POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create swap request" }
      }
    }
  }
})
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

    return { status: 201, data: await shiftSwapService.create(body) }
  }
})
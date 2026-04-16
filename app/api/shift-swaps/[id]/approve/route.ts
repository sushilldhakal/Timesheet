import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  shiftSwapIdParamSchema,
  approveShiftSwapSchema,
  shiftSwapRequestResponseSchema,
} from "@/lib/validations/shift-swaps"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { shiftSwapService } from "@/lib/services/shift-swap/shift-swap-service"

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

    return { status: 200, data: await shiftSwapService.approve(id, body) }
  }
})
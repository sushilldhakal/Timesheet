import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  shiftSwapIdParamSchema, 
  denyShiftSwapSchema, 
  shiftSwapRequestResponseSchema,
} from "@/lib/validations/shift-swaps"
import { errorResponseSchema } from "@/lib/validations/auth"
import { shiftSwapService } from "@/lib/services/shift-swap/shift-swap-service"

/**
 * PATCH /api/shift-swaps/[id]/deny
 * Manager denies a shift swap request
 */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/shift-swaps/{id}/deny',
  summary: 'Deny shift swap request',
  description: 'Manager denies a shift swap request with reason',
  tags: ['ShiftSwaps'],
  security: 'adminAuth',
  request: {
    params: shiftSwapIdParamSchema,
    body: denyShiftSwapSchema,
  },
  responses: {
    200: shiftSwapRequestResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const { id } = params!

    return { status: 200, data: await shiftSwapService.deny(id, body) }
  }
})
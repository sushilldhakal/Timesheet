import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  shiftSwapIdParamSchema, 
  acceptShiftSwapSchema, 
  shiftSwapRequestResponseSchema,
} from "@/lib/validations/shift-swaps"
import { errorResponseSchema } from "@/lib/validations/auth"
import { shiftSwapService } from "@/lib/services/shift-swap/shift-swap-service"

/**
 * PATCH /api/shift-swaps/[id]/accept
 * Recipient accepts a shift swap request
 */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/shift-swaps/{id}/accept',
  summary: 'Accept shift swap request',
  description: 'Recipient accepts a shift swap request',
  tags: ['ShiftSwaps'],
  security: 'adminAuth',
  request: {
    params: shiftSwapIdParamSchema,
    body: acceptShiftSwapSchema,
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

    return { status: 200, data: await shiftSwapService.accept(id, body) }
  }
})
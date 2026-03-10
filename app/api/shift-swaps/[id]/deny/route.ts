import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { ShiftSwapManager } from "@/lib/managers/shift-swap-manager"
import { 
  shiftSwapIdParamSchema, 
  denyShiftSwapSchema, 
  shiftSwapRequestResponseSchema,
} from "@/lib/validations/shift-swaps"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { managerId, reason } = body!

    try {
      await connectDB()
      const shiftSwapManager = new ShiftSwapManager()
      const swapRequest = await shiftSwapManager.denySwapRequest(
        id,
        managerId,
        reason
      )

      return { status: 200, data: { swapRequest } }
    } catch (err: any) {
      console.error("[api/shift-swaps/[id]/deny PATCH]", err)

      if (err.message?.includes("not found")) {
        return { status: 404, data: { error: err.message } }
      }

      if (err.message?.includes("not in PENDING_MANAGER")) {
        return { status: 400, data: { error: err.message } }
      }

      return { status: 500, data: { error: "Failed to deny swap request" } }
    }
  }
})
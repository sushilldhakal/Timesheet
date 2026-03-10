import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB } from "@/lib/db"
import { ShiftSwapManager } from "@/lib/managers/shift-swap-manager"
import { 
  shiftSwapIdParamSchema, 
  acceptShiftSwapSchema, 
  shiftSwapRequestResponseSchema,
} from "@/lib/validations/shift-swaps"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { recipientId } = body!

    try {
      await connectDB()
      const shiftSwapManager = new ShiftSwapManager()
      const swapRequest = await shiftSwapManager.acceptSwapRequest(
        id,
        recipientId
      )

      return { status: 200, data: { swapRequest } }
    } catch (err: any) {
      console.error("[api/shift-swaps/[id]/accept PATCH]", err)

      if (err.message?.includes("not found")) {
        return { status: 404, data: { error: err.message } }
      }

      if (err.message?.includes("not in PENDING_RECIPIENT")) {
        return { status: 400, data: { error: err.message } }
      }

      return { status: 500, data: { error: "Failed to accept swap request" } }
    }
  }
})
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  shiftSwapIdParamSchema,
  approveShiftSwapSchema,
  shiftSwapRequestResponseSchema,
} from "@/lib/validations/shift-swaps"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { getAuthWithUserLocations } = await import("@/lib/auth/auth-api")
    const { connectDB } = await import("@/lib/db")
    const { ShiftSwapManager } = await import("@/lib/managers/shift-swap-manager")

    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { id } = params!
    const { managerId, organizationId } = body!

    try {
      await connectDB()
      const shiftSwapManager = new ShiftSwapManager()
      const swapRequest = await shiftSwapManager.approveSwapRequest(
        id,
        managerId,
        organizationId
      )

      return { status: 200, data: { swapRequest } }
    } catch (err: any) {
      console.error("[api/shift-swaps/[id]/approve PATCH]", err)

      if (err.message?.includes("not found")) {
        return { status: 404, data: { error: err.message } }
      }

      if (err.message?.includes("not in PENDING_MANAGER")) {
        return { status: 400, data: { error: err.message } }
      }

      return {
        status: 500,
        data: { error: "Failed to approve swap request" }
      }
    }
  }
})
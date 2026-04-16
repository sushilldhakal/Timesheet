import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  analyticsShiftIdParamSchema, 
  varianceResponseSchema, 
} from "@/lib/validations/analytics"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { analyticsService } from "@/lib/services/analytics/analytics-service"

/** GET /api/analytics/variance/[shiftId] - Calculate variance for a specific shift */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/analytics/variance/{shiftId}',
  summary: 'Calculate variance for a specific shift',
  description: 'Calculate the variance between scheduled hours and actual hours worked for a specific shift',
  tags: ['Analytics'],
  security: 'adminAuth',
  request: {
    params: analyticsShiftIdParamSchema,
  },
  responses: {
    200: varianceResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { shiftId } = params!

    try {
      return await analyticsService.variance(shiftId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/analytics/variance/[shiftId] GET]", err)
      return {
        status: 500,
        data: { 
          error: "Failed to calculate variance", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        }
      }
    }
  }
})

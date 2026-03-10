import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  analyticsShiftIdParamSchema, 
  varianceResponseSchema, 
} from "@/lib/validations/analytics"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { getAuthWithUserLocations } = await import("@/lib/auth/auth-api")
    const { connectDB } = await import("@/lib/db")
    const { VarianceAnalyticsService } = await import("@/lib/managers/variance-analytics-service")
    const mongoose = await import("mongoose")

    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { shiftId } = params!
    
    // Validate shiftId format
    if (!mongoose.Types.ObjectId.isValid(shiftId)) {
      return { 
        status: 400, 
        data: { error: "Invalid shift ID format" } 
      }
    }

    try {
      await connectDB()
      
      const analyticsService = new VarianceAnalyticsService()
      const result = await analyticsService.calculateVariance(shiftId)
      
      if (!result.success) {
        if (result.error === "SHIFT_NOT_FOUND") {
          return {
            status: 404,
            data: { error: result.error, message: result.message }
          }
        }
        return {
          status: 500,
          data: { error: result.error, message: result.message }
        }
      }
      
      return {
        status: 200,
        data: {
          scheduledHours: result.scheduledHours,
          actualHours: result.actualHours,
          variance: result.variance,
          timesheetCount: result.timesheetCount,
        }
      }
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

import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  analyticsShiftIdParamSchema,
  punctualityResponseSchema,
  analyticsErrorResponseSchema,
} from "@/lib/validations/analytics"
import { errorResponseSchema } from "@/lib/validations/auth"
import { analyticsService } from "@/lib/services/analytics/analytics-service"

const getPunctuality = createApiRoute({
  method: 'GET',
  path: '/api/analytics/punctuality/{shiftId}',
  summary: 'Calculate punctuality for shift',
  description: 'Calculate punctuality for a specific shift',
  tags: ['Analytics'],
  security: 'adminAuth',
  request: {
    params: analyticsShiftIdParamSchema,
  },
  responses: {
    200: punctualityResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: analyticsErrorResponseSchema,
    500: analyticsErrorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { shiftId } = params!

    try {
      return await analyticsService.punctuality(shiftId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/analytics/punctuality/[shiftId] GET]", err)
      return { 
        status: 500, 
        data: { 
          error: "Failed to calculate punctuality", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        }
      }
    }
  }
})

export const GET = getPunctuality

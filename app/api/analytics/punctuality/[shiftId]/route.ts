import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { VarianceAnalyticsService } from "@/lib/managers/variance-analytics-service"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  analyticsShiftIdParamSchema,
  punctualityResponseSchema,
  analyticsErrorResponseSchema,
} from "@/lib/validations/analytics"
import { errorResponseSchema } from "@/lib/validations/auth"

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
      await connectDB()
      
      const analyticsService = new VarianceAnalyticsService()
      const result = await analyticsService.calculatePunctuality(shiftId)
      
      if (!result.success) {
        if (result.error === "SHIFT_NOT_FOUND" || result.error === "NO_TIMESHEET") {
          return { 
            status: 404, 
            data: { 
              error: result.error, 
              message: result.message 
            }
          }
        }
        return { 
          status: 500, 
          data: { 
            error: result.error, 
            message: result.message 
          }
        }
      }
      
      return { 
        status: 200, 
        data: {
          status: result.status,
          minutes: result.minutes,
        }
      }
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

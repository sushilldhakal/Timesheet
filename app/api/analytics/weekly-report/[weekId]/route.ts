import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { VarianceAnalyticsService } from "@/lib/managers/variance-analytics-service"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  analyticsWeekIdParamSchema,
  analyticsReportResponseSchema,
  analyticsErrorResponseSchema,
} from "@/lib/validations/analytics"
import { errorResponseSchema } from "@/lib/validations/auth"

const getWeeklyReport = createApiRoute({
  method: 'GET',
  path: '/api/analytics/weekly-report/{weekId}',
  summary: 'Generate weekly report',
  description: 'Generate weekly report for a specific week',
  tags: ['Analytics'],
  security: 'adminAuth',
  request: {
    params: analyticsWeekIdParamSchema,
  },
  responses: {
    200: analyticsReportResponseSchema,
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

    const { weekId } = params!

    try {
      await connectDB()
      
      const analyticsService = new VarianceAnalyticsService()
      const result = await analyticsService.generateWeeklyReport(weekId)
      
      if (!result.success) {
        if (result.error === "ROSTER_NOT_FOUND") {
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
      
      return { status: 200, data: { report: result.report } }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/analytics/weekly-report/[weekId] GET]", err)
      return { 
        status: 500, 
        data: { 
          error: "Failed to generate weekly report", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        }
      }
    }
  }
})

export const GET = getWeeklyReport

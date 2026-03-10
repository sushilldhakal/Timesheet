import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { VarianceAnalyticsService } from "@/lib/managers/variance-analytics-service"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  analyticsEmployeeIdParamSchema,
  employeeReportQuerySchema,
  analyticsReportResponseSchema,
  analyticsErrorResponseSchema,
} from "@/lib/validations/analytics"
import { errorResponseSchema } from "@/lib/validations/auth"

const getEmployeeReport = createApiRoute({
  method: 'GET',
  path: '/api/analytics/employee-report/{employeeId}',
  summary: 'Generate employee report',
  description: 'Generate employee report for a specific employee within a date range',
  tags: ['Analytics'],
  security: 'adminAuth',
  request: {
    params: analyticsEmployeeIdParamSchema,
    query: employeeReportQuerySchema,
  },
  responses: {
    200: analyticsReportResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: analyticsErrorResponseSchema,
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { employeeId } = params!
    const { startDate, endDate } = query!
    
    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { status: 400, data: { error: "Invalid date values" } }
    }
    if (start > end) {
      return { status: 400, data: { error: "startDate must be before or equal to endDate" } }
    }

    try {
      await connectDB()
      
      const analyticsService = new VarianceAnalyticsService()
      const result = await analyticsService.generateEmployeeReport(employeeId, startDate, endDate)
      
      if (!result.success) {
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
      console.error("[api/analytics/employee-report/[employeeId] GET]", err)
      return { 
        status: 500, 
        data: { 
          error: "Failed to generate employee report", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        }
      }
    }
  }
})

export const GET = getEmployeeReport

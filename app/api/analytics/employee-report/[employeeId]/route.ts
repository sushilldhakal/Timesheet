import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  analyticsEmployeeIdParamSchema,
  employeeReportQuerySchema,
  analyticsReportResponseSchema,
  analyticsErrorResponseSchema,
} from "@/lib/validations/analytics"
import { errorResponseSchema } from "@/lib/validations/auth"
import { analyticsService } from "@/lib/services/analytics/analytics-service"

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

    try {
      return await analyticsService.employeeReport(employeeId, startDate, endDate)
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

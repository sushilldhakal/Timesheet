import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  analyticsWeekIdParamSchema,
  noShowsResponseSchema,
  analyticsErrorResponseSchema,
} from "@/lib/validations/analytics"
import { errorResponseSchema } from "@/lib/validations/auth"
import { analyticsService } from "@/lib/services/analytics/analytics-service"

const getNoShows = createApiRoute({
  method: 'GET',
  path: '/api/analytics/no-shows/{weekId}',
  summary: 'Detect no-show shifts',
  description: 'Detect no-show shifts for a specific week',
  tags: ['Analytics'],
  security: 'adminAuth',
  request: {
    params: analyticsWeekIdParamSchema,
  },
  responses: {
    200: noShowsResponseSchema,
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
      return await analyticsService.noShows(weekId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/analytics/no-shows/[weekId] GET]", err)
      return { 
        status: 500, 
        data: { 
          error: "Failed to detect no-shows", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        }
      }
    }
  }
})

export const GET = getNoShows

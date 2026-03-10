import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { TimesheetManager } from "@/lib/managers/timesheet-manager"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

// Validation schemas
const shiftIdParamSchema = z.object({
  shiftId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid shift ID format")
})

const timesheetsByShiftResponseSchema = z.object({
  success: z.boolean(),
  timesheets: z.array(z.any()),
  count: z.number()
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional()
})

/**
 * GET /api/timesheets/by-shift/:shiftId
 * Get all timesheets linked to a specific roster shift
 * Supports multiple timesheets per shift (e.g., split shifts, breaks)
 */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/timesheets/by-shift/{shiftId}',
  summary: 'Get timesheets by shift',
  description: 'Get all timesheets linked to a specific roster shift',
  tags: ['timesheets'],
  security: 'adminAuth',
  request: {
    params: shiftIdParamSchema
  },
  responses: {
    200: timesheetsByShiftResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      const { shiftId } = params!

      await connectDB()

      const manager = new TimesheetManager()
      const result = await manager.getTimesheetsForShift(shiftId)

      if (!result.success) {
        const statusCode = result.error === "SHIFT_NOT_FOUND" ? 404 : 500
        return {
          status: statusCode,
          data: { error: result.error, message: result.message }
        }
      }

      return {
        status: 200,
        data: {
          success: true,
          timesheets: result.timesheets,
          count: result.timesheets?.length ?? 0,
        }
      }
    } catch (err) {
      console.error("[api/timesheets/by-shift/:shiftId GET]", err)
      return { status: 500, data: { error: "Failed to fetch timesheets for shift" } }
    }
  }
});

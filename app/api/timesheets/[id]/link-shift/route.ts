import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { TimesheetManager } from "@/lib/managers/timesheet-manager"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

// Validation schemas
const timesheetIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid timesheet ID format")
})

const linkShiftRequestSchema = z.object({
  shiftId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid shift ID format")
})

const linkShiftResponseSchema = z.object({
  success: z.boolean(),
  timesheet: z.any()
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional()
})

/**
 * PUT /api/timesheets/:id/link-shift
 * Manually link a timesheet to a roster shift
 */
export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/timesheets/{id}/link-shift',
  summary: 'Link timesheet to shift',
  description: 'Manually link a timesheet to a roster shift',
  tags: ['timesheets'],
  security: 'adminAuth',
  request: {
    params: timesheetIdParamSchema,
    body: linkShiftRequestSchema
  },
  responses: {
    200: linkShiftResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      const { id } = params!
      const { shiftId } = body!

      await connectDB()

      const manager = new TimesheetManager()
      const result = await manager.linkTimesheetToShift(id, shiftId)

      if (!result.success) {
        const statusCode = result.error === "TIMESHEET_NOT_FOUND" ? 404 :
                           result.error === "INVALID_SHIFT_REF" ? 400 : 500
        return {
          status: statusCode,
          data: { error: result.error, message: result.message }
        }
      }

      return {
        status: 200,
        data: {
          success: true,
          timesheet: result.timesheet,
        }
      }
    } catch (err) {
      console.error("[api/timesheets/:id/link-shift PUT]", err)
      return { status: 500, data: { error: "Failed to link timesheet to shift" } }
    }
  }
});

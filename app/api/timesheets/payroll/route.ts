import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { TimesheetManager } from "@/lib/managers/timesheet-manager"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

// Query parameter schema
const payrollQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
  pin: z.string().optional(),
  type: z.enum(["in", "out", "break", "endBreak"]).optional(),
  sortBy: z.enum(["date", "pin", "time"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  format: z.enum(["list", "pairs"]).default("list")
})

// Response schemas
const payrollListResponseSchema = z.object({
  success: z.boolean(),
  format: z.literal("list"),
  startDate: z.string(),
  endDate: z.string(),
  filters: z.object({
    pin: z.string().nullable(),
    type: z.string().nullable()
  }),
  sorting: z.object({
    sortBy: z.string(),
    sortOrder: z.string()
  }),
  timesheets: z.array(z.any()),
  count: z.number()
})

const payrollPairsResponseSchema = z.object({
  success: z.boolean(),
  format: z.literal("pairs"),
  startDate: z.string(),
  endDate: z.string(),
  pairs: z.array(z.any()),
  count: z.number()
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional()
})

/**
 * GET /api/timesheets/payroll
 * Get timesheets for payroll processing within a date range
 * 
 * Query parameters:
 * - startDate: Start date in YYYY-MM-DD format (required)
 * - endDate: End date in YYYY-MM-DD format (required)
 * - pin: Optional employee pin filter
 * - type: Optional type filter (in, out, break, endBreak)
 * - sortBy: Sort field (date, pin, time) - default: date
 * - sortOrder: Sort order (asc, desc) - default: asc
 * - format: Response format (list, pairs) - default: list
 */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/timesheets/payroll',
  summary: 'Get timesheets for payroll',
  description: 'Get timesheets for payroll processing within a date range',
  tags: ['timesheets'],
  security: 'adminAuth',
  request: {
    query: payrollQuerySchema
  },
  responses: {
    200: z.union([payrollListResponseSchema, payrollPairsResponseSchema]),
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      const { startDate, endDate, pin, type, sortBy, sortOrder, format } = query!

      // Validate date range
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { status: 400, data: { error: "Invalid date values" } }
      }

      if (start > end) {
        return { status: 400, data: { error: "startDate must be before or equal to endDate" } }
      }

      await connectDB()

      const manager = new TimesheetManager()

      // Handle different response formats
      if (format === "pairs") {
        // Return clock-in/clock-out pairs for payroll
        const result = await manager.getTimesheetPairsForPayroll(startDate, endDate)

        if (!result.success) {
          return {
            status: 500,
            data: { error: result.error, message: result.message }
          }
        }

        return {
          status: 200,
          data: {
            success: true,
            format: "pairs",
            startDate,
            endDate,
            pairs: result.pairs,
            count: result.pairs?.length ?? 0,
          }
        }
      } else {
        // Return list of timesheets
        const result = await manager.getTimesheetsForDateRange(startDate, endDate, {
          pin,
          type,
          sortBy,
          sortOrder,
        })

        if (!result.success) {
          return {
            status: 500,
            data: { error: result.error, message: result.message }
          }
        }

        return {
          status: 200,
          data: {
            success: true,
            format: "list",
            startDate,
            endDate,
            filters: {
              pin: pin || null,
              type: type || null,
            },
            sorting: {
              sortBy,
              sortOrder,
            },
            timesheets: result.timesheets,
            count: result.timesheets?.length ?? 0,
          }
        }
      }
    } catch (err) {
      console.error("[api/timesheets/payroll GET]", err)
      return { status: 500, data: { error: "Failed to fetch timesheets for payroll" } }
    }
  }
});

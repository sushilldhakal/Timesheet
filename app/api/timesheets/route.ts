import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { 
  timesheetDashboardQuerySchema,
  timesheetsDashboardResponseSchema,
} from "@/lib/validations/daily-shift"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { createTimesheetSchema } from "@/lib/validations/timesheet"
import { apiErrors } from "@/lib/api/api-error"
import { timesheetService } from "@/lib/services/timesheet/timesheet-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/timesheets',
  summary: 'Get aggregated timesheets',
  description: 'Get aggregated timesheets with filtering, sorting, and pagination',
  tags: ['Timesheets'],
  security: 'adminAuth',
  request: {
    query: timesheetDashboardQuerySchema,
  },
  responses: {
    200: timesheetsDashboardResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    const data = await timesheetService.getDashboard(
      { tenantId: ctx.tenantId, userLocations: ctx.userLocations ?? undefined },
      query as any
    )
    return { status: 200, data }
  }
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/timesheets",
  summary: "Create a new timesheet for an employee pay period",
  description:
    "Creates a draft timesheet, auto-linking all shifts within the pay period and calculating totals",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: {
    body: createTimesheetSchema,
  },
  responses: {
    201: z.object({ success: z.boolean(), timesheet: z.any() }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: z.object({ error: z.string(), existingId: z.string() }).or(z.object({ error: z.string(), code: z.string(), details: z.any().optional() })),
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    const result = await timesheetService.createTimesheet(body!)
    return { status: 201, data: result }
  },
})
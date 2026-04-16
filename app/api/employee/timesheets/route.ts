import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { employeeSelfTimesheetService } from "@/lib/services/employee/employee-self-timesheet-service"

const staffTimesheetQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  view: z.enum(['day', 'week', 'month']).default('week'),
})

const staffTimesheetResponseSchema = z.object({
  timesheets: z.array(z.any()),
  total: z.number(),
  totalWorkingMinutes: z.number(),
  totalBreakMinutes: z.number(),
  totalWorkingHours: z.string(),
  totalBreakHours: z.string(),
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employee/timesheets',
  summary: 'Get employee timesheets',
  description: 'Get timesheet data for the authenticated employee',
  tags: ['Employee', 'Timesheets'],
  security: 'employeeAuth',
  request: {
    query: staffTimesheetQuerySchema,
  },
  responses: {
    200: staffTimesheetResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const auth = await getEmployeeFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const result = await employeeSelfTimesheetService.getTimesheets(query)
    return { status: 200, data: result }
  }
})
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { employeeSelfTimesheetService } from "@/lib/services/employee/employee-self-timesheet-service"

const timesheetTodayResponseSchema = z.object({
  date: z.string(),
  punches: z.object({
    clockIn: z.string(),
    breakIn: z.string(),
    breakOut: z.string(),
    clockOut: z.string(),
  }),
})

/** GET /api/employee/timesheet - Today's punches for the logged-in employee */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employee/timesheet',
  summary: 'Get employee timesheet',
  description: 'Get today\'s punch data for the authenticated employee',
  tags: ['Clock'],
  security: 'employeeAuth',
  responses: {
    200: timesheetTodayResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    const auth = await getEmployeeFromCookie();
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    const result = await employeeSelfTimesheetService.getTodayTimesheet()
    return { status: 200, data: result }
  }
});

import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { errorResponseSchema } from "@/lib/validations/auth"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { apiErrors } from "@/lib/api/api-error"
import { timesheetService } from "@/lib/services/timesheet/timesheet-service"

const timesheetIdParamSchema = z.object({
  id: z.string().min(1, "Timesheet ID is required"),
})

const evaluateTimesheetResponseSchema = z.object({
  timesheetId: z.string(),
  employee: z.object({
    id: z.string(),
    name: z.string(),
    employmentType: z.string(),
    baseRate: z.number(),
    awardTags: z.array(z.string()),
  }),
  award: z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
  }),
  shiftContext: z.object({
    employeeId: z.string(),
    employmentType: z.string(),
    baseRate: z.number(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    awardTags: z.array(z.string()),
    isPublicHoliday: z.boolean(),
    weeklyHoursWorked: z.number(),
    dailyHoursWorked: z.number(),
    breaks: z.array(z.object({
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      isPaid: z.boolean(),
    })),
  }),
  awardEngineResult: z.object({
    payLines: z.array(z.object({
      units: z.number(),
      from: z.string().datetime(),
      to: z.string().datetime(),
      name: z.string(),
      exportName: z.string(),
      ordinaryHours: z.number(),
      cost: z.number(),
      baseRate: z.number(),
      multiplier: z.number().optional(),
      ruleId: z.string().optional(),
    })),
    totalCost: z.number(),
    totalHours: z.number(),
    breakEntitlements: z.array(z.any()),
    leaveAccruals: z.array(z.any()),
  }),
  tandaComparison: z.array(z.object({
    units: z.number(),
    from: z.string(),
    to: z.string(),
    name: z.string(),
    exportName: z.string(),
    cost: z.number(),
    multiplier: z.number(),
  })),
})

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/timesheets/[id]/evaluate - Evaluate timesheet entry through AwardEngine */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/timesheets/{id}/evaluate',
  summary: 'Evaluate timesheet entry with AwardEngine',
  description: 'Process a timesheet entry through the AwardEngine and return results in Tanda-compatible format for comparison',
  tags: ['Timesheets', 'Awards'],
  security: 'adminAuth',
  request: {
    params: timesheetIdParamSchema,
  },
  responses: {
    200: evaluateTimesheetResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    if (!params) throw apiErrors.badRequest("Timesheet ID is required")
    const data = await timesheetService.evaluateDailyShift(params.id)
    return { status: 200, data }
  }
});
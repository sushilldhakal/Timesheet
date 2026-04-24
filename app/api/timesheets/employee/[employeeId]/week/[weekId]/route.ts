import { createApiRoute } from "@/lib/api/create-api-route"
import { apiErrors } from "@/lib/api/api-error"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { z } from "zod"
import { reconcileWeek } from "@/lib/services/timesheet/timesheet-reconciliation"

export const runtime = "nodejs"

const paramsSchema = z.object({
  employeeId: z.string(),
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "weekId must match YYYY-Www (e.g., 2024-W15)"),
})

const querySchema = z.object({
  maxHoursPerWeek: z.coerce.number().positive().optional(),
  minRestHoursBetweenShifts: z.coerce.number().positive().optional(),
  maxConsecutiveDays: z.coerce.number().int().positive().optional(),
  rosterVarianceThresholdMinutes: z.coerce.number().int().positive().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/timesheets/employee/[employeeId]/week/[weekId]",
  summary: "Reconcile roster vs actual week shifts",
  description:
    "Returns a reconciled week view for an employee combining rostered shifts and actual DailyShifts, including variances and compliance checks.",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: { params: paramsSchema, query: querySchema },
  responses: {
    200: z.any(),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    if (!params?.employeeId) throw apiErrors.badRequest("employeeId is required")
    if (!params?.weekId) throw apiErrors.badRequest("weekId is required")

    const data = await reconcileWeek({
      tenantId: ctx.tenantId,
      employeeId: params.employeeId,
      weekId: params.weekId,
      rules: query ?? undefined,
    })

    return { status: 200, data }
  },
})


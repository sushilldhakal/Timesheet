import { createApiRoute } from "@/lib/api/create-api-route"
import { apiErrors } from "@/lib/api/api-error"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { z } from "zod"

export const runtime = "nodejs"

const paramsSchema = z.object({
  employeeId: z.string(),
})

const querySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must match yyyy-MM-dd"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must match yyyy-MM-dd"),
  maxHoursPerWeek: z.coerce.number().positive().optional(),
  minRestHoursBetweenShifts: z.coerce.number().positive().optional(),
  maxConsecutiveDays: z.coerce.number().int().positive().optional(),
  rosterVarianceThresholdMinutes: z.coerce.number().int().positive().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/timesheets/employee/[employeeId]/range",
  summary: "Reconcile roster vs actual shifts (range)",
  description:
    "Returns a reconciled view for an employee for a specific date range combining rostered shifts and actual DailyShifts, including variances and compliance checks.",
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
    if (!query?.startDate) throw apiErrors.badRequest("startDate is required")
    if (!query?.endDate) throw apiErrors.badRequest("endDate is required")

    const { startDate, endDate, ...rules } = query

    // Dynamic import avoids Turbopack occasionally holding a stale named export binding in dev.
    const { reconcileRange } = await import("@/lib/services/timesheet-reconciliation")

    const data = await reconcileRange({
      tenantId: ctx.tenantId,
      employeeId: params.employeeId,
      startDate,
      endDate,
      rules: Object.keys(rules).length ? (rules as any) : undefined,
    })

    return { status: 200, data }
  },
})


import { z } from "zod"
import mongoose from "mongoose"
import { startOfWeek, endOfWeek } from "date-fns"
import { createApiRoute } from "@/lib/api/create-api-route"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { apiErrors } from "@/lib/api/api-error"
import { connectDB } from "@/lib/db"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { getWeekBoundaries } from "@/lib/db/schemas/roster"

const paramsSchema = z.object({ employeeId: z.string() })

const querySchema = z.object({
  weekId: z.string().optional(),
  weekStart: z.string().optional(), // ISO date
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/daily-shifts/employee/[employeeId]/week",
  summary: "Fetch weekly shifts for an employee",
  description: "Returns all DailyShift records for an employee in a given week (weekId or weekStart).",
  tags: ["DailyShifts"],
  security: "adminAuth",
  request: { params: paramsSchema, query: querySchema },
  responses: {
    200: z.object({
      employeeId: z.string(),
      weekStartUtc: z.string(),
      weekEndUtc: z.string(),
      shifts: z.array(z.any()),
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const allowedRoles = ["admin", "super_admin", "manager", "supervisor", "accounts"]
    if (!allowedRoles.includes(String(ctx.auth.role))) {
      return { status: 403, data: { error: "Forbidden" } }
    }

    const employeeId = params!.employeeId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) throw apiErrors.badRequest("Invalid employeeId")

    await connectDB()

    let start: Date
    let end: Date
    if (query?.weekId) {
      const res = getWeekBoundaries(query.weekId)
      start = res.start
      end = res.end
    } else if (query?.weekStart) {
      const d = new Date(query.weekStart)
      if (isNaN(d.getTime())) throw apiErrors.badRequest("Invalid weekStart")
      start = startOfWeek(d, { weekStartsOn: 1 })
      end = endOfWeek(d, { weekStartsOn: 1 })
    } else {
      const now = new Date()
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
    }

    const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0))
    const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999))

    const shifts = await DailyShift.find({
      tenantId: new mongoose.Types.ObjectId(String(ctx.tenantId)),
      employeeId: new mongoose.Types.ObjectId(employeeId),
      date: { $gte: startUTC, $lte: endUTC },
      status: { $ne: "rejected" },
    })
      .sort({ date: 1 })
      .lean()

    return {
      status: 200,
      data: {
        employeeId,
        weekStartUtc: startUTC.toISOString(),
        weekEndUtc: endUTC.toISOString(),
        shifts,
      },
    }
  },
})


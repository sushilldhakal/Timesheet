import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  inactiveEmployeesResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"
import type { InactiveEmployeeRow } from "@/lib/types/dashboard"

const INACTIVE_DAYS = 100
const DATE_FMT = "dd-MM-yyyy"

/** GET /api/dashboard/inactive-employees - Employees with no punch in the last 100 days */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/inactive-employees',
  summary: 'Get inactive employees',
  description: 'Get employees with no punch in the last 100 days',
  tags: ['Dashboard'],
  security: 'adminAuth',
  responses: {
    200: inactiveEmployeesResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const { format } = await import("date-fns")
    const { getAuthWithUserLocations, employeeLocationFilter } = await import("@/lib/auth/auth-api")
    const { connectDB, Employee, DailyShift } = await import("@/lib/db")

    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      await connectDB()

      // Group by pin and get the most recent date for each employee
      const grouped = await DailyShift.aggregate<{ _id: string; lastDate: Date }>([
        { $group: { _id: "$pin", lastDate: { $max: "$date" } } },
      ])

      const lastPunchMap = new Map<string, { date: Date; dateStr: string }>()
      for (const x of grouped) {
        if (!x._id || !x.lastDate) continue
        const pin = String(x._id)
        const date = x.lastDate instanceof Date ? x.lastDate : new Date(x.lastDate)
        if (!isNaN(date.getTime())) {
          lastPunchMap.set(pin, { 
            date, 
            dateStr: format(date, DATE_FMT) 
          })
        }
      }

      const empFilter: Record<string, unknown> = {}
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
      const allEmployees = await Employee.find(empFilter).lean()
      const inactive: InactiveEmployeeRow[] = []
      const now = new Date()

      for (const e of allEmployees) {
        const emp = e as { _id: unknown; pin: string; name?: string }
        const pin = emp.pin ?? ""
        const entry = lastPunchMap.get(pin) ?? null
        let daysInactive: number
        if (!entry || isNaN(entry.date.getTime())) {
          daysInactive = INACTIVE_DAYS + 1
        } else {
          daysInactive = Math.floor((now.getTime() - entry.date.getTime()) / (24 * 60 * 60 * 1000))
        }
        if (daysInactive >= INACTIVE_DAYS) {
          inactive.push({
            id: String(emp._id),
            name: emp.name ?? "",
            pin,
            lastPunchDate: entry ? format(entry.date, DATE_FMT) : null,
            daysInactive,
          })
        }
      }

      inactive.sort((a, b) => b.daysInactive - a.daysInactive)

      return {
        status: 200,
        data: {
          inactiveEmployees: inactive,
          thresholdDays: INACTIVE_DAYS,
        }
      }
    } catch (err) {
      console.error("[api/dashboard/inactive-employees GET]", err)
      return {
        status: 500,
        data: { error: "Failed to load inactive employees" }
      }
    }
  }
})

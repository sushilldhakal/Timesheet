import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  hoursSummaryQuerySchema, 
  hoursSummaryResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"

/** GET /api/dashboard/hours-summary?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd
 *  Returns most hours (top staff, overtime) and least hours (< 38h, min first). */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/hours-summary',
  summary: 'Get hours summary dashboard',
  description: 'Returns most hours (top staff, overtime) and least hours (< 38h, min first) for a date range',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    query: hoursSummaryQuerySchema,
  },
  responses: {
    200: hoursSummaryResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const { format, startOfWeek, endOfWeek } = await import("date-fns")
    const { getAuthWithUserLocations, employeeLocationFilter } = await import("@/lib/auth/auth-api")
    const { connectDB, Employee, DailyShift } = await import("@/lib/db")

    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { startDate: startParam, endDate: endParam } = query || {}

    const now = new Date()
    const defaultStart = startOfWeek(now, { weekStartsOn: 1 })
    const defaultEnd = endOfWeek(now, { weekStartsOn: 1 })
    const start = startParam ? new Date(startParam) : defaultStart
    const end = endParam ? new Date(endParam) : defaultEnd

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return {
        status: 400,
        data: { error: "Invalid startDate or endDate (use yyyy-MM-dd)" }
      }
    }

    try {
      await connectDB()
      
      // Query DailyShift with date range
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 366) {
        return { status: 400, data: { error: "Date range too large" } }
      }

      const empFilter: Record<string, unknown> = {}
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
      const employees = await Employee.find(empFilter).lean()

      const shiftQuery: Record<string, unknown> = { 
        date: { $gte: start, $lte: end },
        status: { $in: ["completed", "approved"] }
      }
      if (Object.keys(locFilter).length > 0) {
        const allowedPins = (employees as { pin?: string }[]).map((e) => e.pin ?? "").filter(Boolean)
        shiftQuery.pin = allowedPins.length > 0 ? { $in: allowedPins } : { $in: [""] }
      }
      
      const shifts = await DailyShift.find(shiftQuery).lean()

      // Calculate total hours per employee using totalWorkingHours field
      const minutesByPin = new Map<string, number>()
      for (const shift of shifts) {
        const pin = String(shift.pin ?? "")
        if (!pin) continue
        
        // Use totalWorkingHours if available, otherwise calculate from clock times
        let minutes = 0
        if (shift.totalWorkingHours && shift.totalWorkingHours > 0) {
          minutes = shift.totalWorkingHours * 60
        } else if (shift.clockIn?.time && shift.clockOut?.time) {
          const clockInTime = shift.clockIn.time instanceof Date ? shift.clockIn.time : new Date(shift.clockIn.time)
          const clockOutTime = shift.clockOut.time instanceof Date ? shift.clockOut.time : new Date(shift.clockOut.time)
          const breakMinutes = shift.totalBreakMinutes ?? 0
          
          if (!isNaN(clockInTime.getTime()) && !isNaN(clockOutTime.getTime())) {
            const totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60)
            minutes = Math.max(0, totalMinutes - breakMinutes)
          }
        }
        
        if (minutes > 0) {
          minutesByPin.set(pin, (minutesByPin.get(pin) ?? 0) + minutes)
        }
      }

      const pinToName = new Map<string, string>()
      for (const e of employees) {
        const emp = e as { pin: string; name?: string }
        pinToName.set(emp.pin, emp.name ?? emp.pin)
      }

      const withHours: { name: string; pin: string; hours: number }[] = []
      for (const [pin, totalMinutes] of minutesByPin) {
        const hours = Math.round((totalMinutes / 60) * 10) / 10
        withHours.push({
          name: pinToName.get(pin) ?? pin,
          pin,
          hours,
        })
      }

      const mostHours = [...withHours].sort((a, b) => b.hours - a.hours).slice(0, 20)
      const leastHours = withHours
        .filter((x) => x.hours < 38)
        .sort((a, b) => a.hours - b.hours)

      return {
        status: 200,
        data: {
          mostHours,
          leastHours,
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end, "yyyy-MM-dd"),
        }
      }
    } catch (err) {
      console.error("[api/dashboard/hours-summary GET]", err)
      return {
        status: 500,
        data: { error: "Failed to load hours summary" }
      }
    }
  }
})

import { format, parse, isValid, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Employee, DailyShift } from "@/lib/db"
import { formatDate as formatDateDisplay } from "@/lib/utils/format/date-format"
import { parseTimeToMinutes, minutesToHours, formatTimeString } from "@/lib/utils/format/time"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

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

function dateRangeToDateObjects(start: Date, end: Date): Date[] {
  const out: Date[] = []
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  
  const endDate = new Date(end)
  endDate.setHours(0, 0, 0, 0)
  
  while (cur <= endDate) {
    out.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

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

    const {
      startDate: startParam,
      endDate: endParam,
      view = 'week'
    } = query || {}

    let start: Date
    let end: Date
    if (startParam && endParam) {
      start = new Date(startParam)
      end = new Date(endParam)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
          status: 400,
          data: { error: "Invalid startDate or endDate" }
        }
      }
      if (start > end) {
        return {
          status: 400,
          data: { error: "startDate must be before or equal to endDate" }
        }
      }
    } else {
      const now = new Date()
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
    }

    const dateStrings = dateRangeToDateObjects(start, end)
    if (dateStrings.length > 366) {
      return {
        status: 400,
        data: { error: "Date range too large (max 366 days)" }
      }
    }

    try {
      await connectDB()

      // Get the employee data
      const employee = await Employee.findById(auth.sub).lean()
      if (!employee) {
        return {
          status: 401,
          data: { error: "Employee not found" }
        }
      }

      const emp = employee as { _id: unknown; pin: string; name?: string; employer?: string[]; location?: string[]; comment?: string }
      
      // Get role assignments for the employee
      const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
      const roleAssignments = await EmployeeRoleAssignment.find({
        employeeId: emp._id,
        isActive: true,
      }).populate("roleId", "name").lean()
      
      const roleNames = roleAssignments.map((assignment: any) => assignment.roleId?.name).filter(Boolean)

      const employeeData = {
        id: String(emp._id),
        name: emp.name ?? "",
        employer: Array.isArray(emp.employer) ? emp.employer.join(", ") : "",
        role: roleNames.join(", "),
        location: Array.isArray(emp.location) ? emp.location.join(", ") : "",
        comment: emp.comment ?? "",
      }

      const startUTC = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0))
      const endUTC = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999))
      
      const queryFilter = {
        pin: emp.pin,
        date: { 
          $gte: startUTC,
          $lte: endUTC
        },
      }
      const shifts = await DailyShift.find(queryFilter).lean()

      const rows: any[] = []
      for (const shift of shifts) {
        const shiftDate = shift.date
        if (!shiftDate) continue

        const date = formatDateDisplay(new Date(shiftDate.getUTCFullYear(), shiftDate.getUTCMonth(), shiftDate.getUTCDate()))

        const clockIn = formatTimeString(shift.clockIn?.time)
        const breakIn = formatTimeString(shift.breakIn?.time)
        const breakOut = formatTimeString(shift.breakOut?.time)
        const clockOut = formatTimeString(shift.clockOut?.time)

        const breakMinutes = shift.totalBreakMinutes ?? 0
        const totalMin = shift.totalWorkingHours ? Math.round(shift.totalWorkingHours * 60) : 0

        rows.push({
          date,
          employeeId: employeeData.id,
          name: employeeData.name,
          pin: emp.pin,
          comment: employeeData.comment,
          employer: employeeData.employer,
          role: employeeData.role,
          location: employeeData.location,
          clockIn,
          breakIn,
          breakOut,
          clockOut,
          clockInImage: shift.clockIn?.image || "",
          clockOutImage: shift.clockOut?.image || "",
          breakMinutes,
          breakHours: minutesToHours(breakMinutes),
          totalMinutes: totalMin,
          totalHours: minutesToHours(totalMin),
        })
      }

      // Sort by date
      const parseDateForSort = (s: string) => {
        try {
          const d1 = parse(s, process.env.NEXT_PUBLIC_DATE_FORMAT || process.env.DATE_FORMAT || "dd-MM-yyyy", new Date())
          if (isValid(d1)) return d1.getTime()
          const d2 = parse(s, "yyyy-MM-dd", new Date())
          return isValid(d2) ? d2.getTime() : 0
        } catch {
          return 0
        }
      }
      
      rows.sort((a, b) => parseDateForSort(a.date) - parseDateForSort(b.date))

      const totalWorkingMinutes = rows.reduce((s, r) => s + r.totalMinutes, 0)
      const totalBreakMinutes = rows.reduce((s, r) => s + r.breakMinutes, 0)

      const rowDisplayDateToYmd = (dateStr: string): string => {
        try {
          const dateFormatEnv = process.env.NEXT_PUBLIC_DATE_FORMAT || process.env.DATE_FORMAT || "dd-MM-yyyy"
          const d1 = parse(dateStr, dateFormatEnv, new Date())
          if (isValid(d1)) return format(d1, "yyyy-MM-dd")
          const d2 = parse(dateStr, "yyyy-MM-dd", new Date())
          if (isValid(d2)) return format(d2, "yyyy-MM-dd")
        } catch {
          /* ignore */
        }
        return dateStr
      }

      if (view === "week") {
        // Aggregate by day for week view
        const dailyMinutes: Record<string, number> = {}
        let breakMinutes = 0

        for (const r of rows) {
          const ymd = rowDisplayDateToYmd(r.date)
          dailyMinutes[ymd] = (dailyMinutes[ymd] ?? 0) + r.totalMinutes
          breakMinutes += r.breakMinutes
        }

        const weekRow = {
          employeeId: employeeData.id,
          name: employeeData.name,
          pin: emp.pin,
          comment: employeeData.comment,
          employer: employeeData.employer,
          role: employeeData.role,
          location: employeeData.location,
          dailyMinutes,
          totalMinutes: totalWorkingMinutes,
          breakMinutes,
        }

        return {
          status: 200,
          data: {
            timesheets: [weekRow],
            total: 1,
            totalWorkingMinutes,
            totalBreakMinutes,
            totalWorkingHours: minutesToHours(totalWorkingMinutes),
            totalBreakHours: minutesToHours(totalBreakMinutes),
          },
        }
      }

      if (view === "month") {
        // Aggregate for month view
        const datesWithWork = new Set<string>()
        for (const r of rows) {
          if (r.totalMinutes > 0) {
            const ymd = rowDisplayDateToYmd(r.date)
            datesWithWork.add(ymd)
          }
        }

        const monthRow = {
          employeeId: employeeData.id,
          name: employeeData.name,
          pin: emp.pin,
          employer: employeeData.employer,
          role: employeeData.role,
          location: employeeData.location,
          daysWorked: datesWithWork.size,
          totalMinutes: totalWorkingMinutes,
          breakMinutes: totalBreakMinutes,
          totalHours: minutesToHours(totalWorkingMinutes),
          totalBreak: minutesToHours(totalBreakMinutes),
          employersList: employeeData.employer,
          locationsList: employeeData.location,
        }

        return {
          status: 200,
          data: {
            timesheets: [monthRow],
            total: 1,
            totalWorkingMinutes,
            totalBreakMinutes,
            totalWorkingHours: minutesToHours(totalWorkingMinutes),
            totalBreakHours: minutesToHours(totalBreakMinutes),
          },
        }
      }

      // view === "day": return raw shift rows
      return {
        status: 200,
        data: {
          timesheets: rows,
          total: rows.length,
          totalWorkingMinutes,
          totalBreakMinutes,
          totalWorkingHours: minutesToHours(totalWorkingMinutes),
          totalBreakHours: minutesToHours(totalBreakMinutes),
        },
      }
    } catch (err) {
      console.error("[api/employee/timesheets GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch timesheets" }
      }
    }
  }
})
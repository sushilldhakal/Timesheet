import { format, parse, isValid, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth/auth-api"
import { connectDB, Employee, DailyShift, Timesheet } from "@/lib/db"
import { formatDate as formatDateDisplay } from "@/lib/utils/format/date-format"
import { parseTimeToMinutes, minutesToHours, formatTimeString } from "@/lib/utils/format/time"
import { 
  timesheetDashboardQuerySchema,
  timesheetPostSchema,
  timesheetsDashboardResponseSchema,
  timesheetCreateResponseSchema,
} from "@/lib/validations/timesheet"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

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
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const {
      startDate: startParam,
      endDate: endParam,
      employeeId: employeeIds = [],
      employer: employers = [],
      location: locations = [],
      role: roles = [],
      view = 'day',
      limit = 50,
      offset = 0,
      sortBy = 'date',
      order = 'asc'
    } = query || {}

    const dateFormatEnv = process.env.NEXT_PUBLIC_DATE_FORMAT || process.env.DATE_FORMAT || "dd-MM-yyyy"

    const rowDisplayDateToYmd = (dateStr: string): string => {
      try {
        const d1 = parse(dateStr, dateFormatEnv, new Date())
        if (isValid(d1)) return format(d1, "yyyy-MM-dd")
        const d2 = parse(dateStr, "yyyy-MM-dd", new Date())
        if (isValid(d2)) return format(d2, "yyyy-MM-dd")
      } catch {
        /* ignore */
      }
      return dateStr
    }

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

      let pins: string[] = []
      const employeeMap = new Map<
        string,
        { id: string; name: string; employer: string; role: string; location: string; comment: string }
      >()

      if (employeeIds.length > 0) {
        const emps = await Employee.find({ _id: { $in: employeeIds } }).lean()
        for (const emp of emps) {
          const e = emp as { _id: unknown; pin: string; name?: string; employer?: string[]; location?: string[]; comment?: string }
          const locFilter = employeeLocationFilter(ctx.userLocations)
          if (Object.keys(locFilter).length > 0) {
            const empLocs = Array.isArray(e.location) ? e.location : []
            const userLocs = ctx.userLocations ?? []
            const inLocation = empLocs.some((loc) => userLocs.includes(String(loc).trim()))
            if (!inLocation) continue
          }
          
          const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
          const roleAssignments = await EmployeeRoleAssignment.find({
            employeeId: e._id,
            isActive: true,
          }).populate("roleId", "name").lean()
          
          const roleNames = roleAssignments.map((assignment: any) => assignment.roleId?.name).filter(Boolean)
          
          if (roles.length > 0) {
            const hasMatchingRole = roleNames.some(roleName => roles.includes(roleName))
            if (!hasMatchingRole) continue
          }
          
          pins.push(e.pin)
          
          employeeMap.set(e.pin, {
            id: String(e._id),
            name: e.name ?? "",
            employer: Array.isArray(e.employer) ? e.employer.join(", ") : "",
            role: roleNames.join(", "),
            location: Array.isArray(e.location) ? e.location.join(", ") : "",
            comment: e.comment ?? "",
          })
        }
      } else {
        const filter: Record<string, unknown> = {}
        const andConditions: Record<string, unknown>[] = []
        const locFilter = employeeLocationFilter(ctx.userLocations)
        if (Object.keys(locFilter).length > 0) andConditions.push(locFilter)
        if (employers.length > 0) {
          andConditions.push({
            employer: { $in: employers }
          })
        }
        if (locations.length > 0) {
          andConditions.push({
            location: { $in: locations }
          })
        }
        if (andConditions.length > 0) filter.$and = andConditions
        const employees = await Employee.find(filter).lean()
        pins = employees.map((e) => (e as { pin: string }).pin)
        
        const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
        const employeeIds = employees.map((e) => (e as { _id: unknown })._id)
        const roleAssignments = await EmployeeRoleAssignment.find({
          employeeId: { $in: employeeIds },
          isActive: true,
        }).populate("roleId", "name").lean()
        
        const rolesByEmployee = new Map<string, string[]>()
        for (const assignment of roleAssignments) {
          const empId = String((assignment as any).employeeId)
          const roleName = (assignment as any).roleId?.name
          if (roleName) {
            if (!rolesByEmployee.has(empId)) {
              rolesByEmployee.set(empId, [])
            }
            rolesByEmployee.get(empId)!.push(roleName)
          }
        }
        
        for (const emp of employees) {
          const e = emp as { _id: unknown; pin: string; name?: string; employer?: string[]; location?: string[]; comment?: string }
          const empId = String(e._id)
          const roleNames = rolesByEmployee.get(empId) || []
          
          if (roles.length > 0) {
            const hasMatchingRole = roleNames.some(roleName => roles.includes(roleName))
            if (!hasMatchingRole) continue
          }
          
          employeeMap.set(e.pin, {
            id: String(e._id),
            name: e.name ?? "",
            employer: Array.isArray(e.employer) ? e.employer.join(", ") : "",
            role: roleNames.join(", "),
            location: Array.isArray(e.location) ? e.location.join(", ") : "",
            comment: e.comment ?? "",
          })
        }
      }

      const startUTC = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0))
      const endUTC = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999))
      
      const queryFilter: { pin: { $in: string[] }; date: { $gte: Date; $lte: Date } } = {
        pin: { $in: pins },
        date: { 
          $gte: startUTC,
          $lte: endUTC
        },
      }
      const shifts = await DailyShift.find(queryFilter).lean()

      const rows: any[] = []
      for (const shift of shifts) {
        const pin = String(shift.pin ?? "")
        const shiftDate = shift.date
        if (!pin || !shiftDate) continue

        const meta = employeeMap.get(pin)

        const date = formatDateDisplay(new Date(shiftDate.getUTCFullYear(), shiftDate.getUTCMonth(), shiftDate.getUTCDate()))

        const clockIn = formatTimeString(shift.clockIn?.time)
        const breakIn = formatTimeString(shift.breakIn?.time)
        const breakOut = formatTimeString(shift.breakOut?.time)
        const clockOut = formatTimeString(shift.clockOut?.time)

        const breakMinutes = shift.totalBreakMinutes ?? 0
        const totalMin = shift.totalWorkingHours ? Math.round(shift.totalWorkingHours * 60) : 0

        rows.push({
          date,
          employeeId: meta?.id ?? "",
          name: meta?.name ?? "",
          pin,
          comment: meta?.comment ?? "",
          employer: meta?.employer ?? "",
          role: meta?.role ?? "",
          location: meta?.location ?? "",
          clockIn,
          breakIn,
          breakOut,
          clockOut,
          breakMinutes,
          breakHours: minutesToHours(breakMinutes),
          totalMinutes: totalMin,
          totalHours: minutesToHours(totalMin),
          clockInDeviceId: shift.clockIn?.deviceId,
          clockInDeviceLocation: shift.clockIn?.deviceLocation,
          breakInDeviceId: shift.breakIn?.deviceId,
          breakInDeviceLocation: shift.breakIn?.deviceLocation,
          breakOutDeviceId: shift.breakOut?.deviceId,
          breakOutDeviceLocation: shift.breakOut?.deviceLocation,
          clockOutDeviceId: shift.clockOut?.deviceId,
          clockOutDeviceLocation: shift.clockOut?.deviceLocation,
        })
      }

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
      const mul = order === "asc" ? 1 : -1
      rows.sort((a, b) => {
        let cmp = 0
        if (sortBy === "date") {
          cmp = parseDateForSort(a.date) - parseDateForSort(b.date)
        } else if (sortBy === "name") {
          cmp = a.name.localeCompare(b.name)
        } else if (sortBy === "totalHours") {
          cmp = a.totalMinutes - b.totalMinutes
        } else if (sortBy === "breakHours") {
          cmp = a.breakMinutes - b.breakMinutes
        } else {
          const aVal = String((a as unknown as Record<string, unknown>)[sortBy] ?? "")
          const bVal = String((b as unknown as Record<string, unknown>)[sortBy] ?? "")
          cmp = aVal.localeCompare(bVal)
        }
        if (cmp !== 0) return cmp * mul
        return (parseDateForSort(a.date) - parseDateForSort(b.date)) * mul
      })

      const totalWorkingMinutes = rows.reduce((s, r) => s + r.totalMinutes, 0)
      const totalBreakMinutes = rows.reduce((s, r) => s + r.breakMinutes, 0)

      if (view === "week") {
        type Row = (typeof rows)[number]
        const byEmp = new Map<
          string,
          {
            employeeId: string
            name: string
            pin: string
            comment: string
            employer: string
            role: string
            location: string
            dailyMinutes: Record<string, number>
            breakMinutes: number
          }
        >()

        for (const r of rows as Row[]) {
          const id = r.employeeId
          if (!id) continue
          if (!byEmp.has(id)) {
            byEmp.set(id, {
              employeeId: id,
              name: r.name,
              pin: r.pin,
              comment: r.comment ?? "",
              employer: r.employer,
              role: r.role,
              location: r.location,
              dailyMinutes: {},
              breakMinutes: 0,
            })
          }
          const agg = byEmp.get(id)!
          const ymd = rowDisplayDateToYmd(r.date)
          agg.dailyMinutes[ymd] = (agg.dailyMinutes[ymd] ?? 0) + r.totalMinutes
          agg.breakMinutes += r.breakMinutes
        }

        const weekRows = Array.from(byEmp.values())
          .map((e) => {
            const totalMinutes = Object.values(e.dailyMinutes).reduce((a, b) => a + b, 0)
            return {
              employeeId: e.employeeId,
              name: e.name,
              pin: e.pin,
              comment: e.comment,
              employer: e.employer,
              role: e.role,
              location: e.location,
              dailyMinutes: e.dailyMinutes,
              totalMinutes,
              breakMinutes: e.breakMinutes,
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name))

        const n = weekRows.length
        return {
          status: 200,
          data: {
            timesheets: weekRows,
            total: n,
            limit: n,
            offset: 0,
            totalWorkingMinutes,
            totalBreakMinutes,
            totalWorkingHours: minutesToHours(totalWorkingMinutes),
            totalBreakHours: minutesToHours(totalBreakMinutes),
          },
        }
      }

      if (view === "month") {
        type Row = (typeof rows)[number]
        const byEmp = new Map<
          string,
          {
            employeeId: string
            name: string
            pin: string
            employer: string
            role: string
            location: string
            datesWithWork: Set<string>
            totalMinutes: number
            breakMinutes: number
            employers: Set<string>
            locations: Set<string>
          }
        >()

        for (const r of rows as Row[]) {
          const id = r.employeeId
          if (!id) continue
          if (!byEmp.has(id)) {
            byEmp.set(id, {
              employeeId: id,
              name: r.name,
              pin: r.pin,
              employer: r.employer,
              role: r.role,
              location: r.location,
              datesWithWork: new Set(),
              totalMinutes: 0,
              breakMinutes: 0,
              employers: new Set(),
              locations: new Set(),
            })
          }
          const agg = byEmp.get(id)!
          agg.totalMinutes += r.totalMinutes
          agg.breakMinutes += r.breakMinutes
          const ymd = rowDisplayDateToYmd(r.date)
          if (r.totalMinutes > 0) agg.datesWithWork.add(ymd)
          if (r.employer) agg.employers.add(r.employer)
          if (r.location) agg.locations.add(r.location)
        }

        const monthRows = Array.from(byEmp.values())
          .map((e) => ({
            employeeId: e.employeeId,
            name: e.name,
            pin: e.pin,
            employer: e.employer,
            role: e.role,
            location: e.location,
            daysWorked: e.datesWithWork.size,
            totalMinutes: e.totalMinutes,
            breakMinutes: e.breakMinutes,
            totalHours: minutesToHours(e.totalMinutes),
            totalBreak: minutesToHours(e.breakMinutes),
            employersList: [...e.employers].join(", "),
            locationsList: [...e.locations].join(", "),
          }))
          .sort((a, b) => a.name.localeCompare(b.name))

        const n = monthRows.length
        return {
          status: 200,
          data: {
            timesheets: monthRows,
            total: n,
            limit: n,
            offset: 0,
            totalWorkingMinutes,
            totalBreakMinutes,
            totalWorkingHours: minutesToHours(totalWorkingMinutes),
            totalBreakHours: minutesToHours(totalBreakMinutes),
          },
        }
      }

      // view === "day": paginate raw shift rows
      const total = rows.length
      const paginated = rows.slice(offset, offset + limit)

      return {
        status: 200,
        data: {
          timesheets: paginated,
          total,
          limit,
          offset,
          totalWorkingMinutes,
          totalBreakMinutes,
          totalWorkingHours: minutesToHours(totalWorkingMinutes),
          totalBreakHours: minutesToHours(totalBreakMinutes),
        },
      }
    } catch (err) {
      console.error("[api/timesheets GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch timesheets" }
      }
    }
  }
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/timesheets',
  summary: 'Create timesheet entry',
  description: 'Create a new timesheet entry with automatic shift matching',
  tags: ['Timesheets'],
  security: 'adminAuth',
  request: {
    body: timesheetPostSchema,
  },
  responses: {
    201: timesheetCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const {
      pin,
      type,
      date,
      time,
      image,
      lat,
      lng,
      where,
      flag,
      working,
      source,
      deviceId,
      deviceLocation,
      breakSource,
      breakRuleRef,
      scheduleShiftId,
    } = body!

    try {
      await connectDB()

      const { TimesheetManager } = await import("@/lib/managers/timesheet-manager")
      const manager = new TimesheetManager()

      const timesheetData: any = {
        pin,
        type,
        date,
        time,
        image,
        lat,
        lng,
        where,
        flag,
        working,
        source,
        deviceId,
        deviceLocation,
        breakSource,
        breakRuleRef,
      }

      if (scheduleShiftId) {
        const mongoose = await import("mongoose")
        timesheetData.scheduleShiftId = new mongoose.Types.ObjectId(scheduleShiftId)
      }

      const timesheet = await Timesheet.create(timesheetData)

      let shiftMatched = false
      if (type === "in" && !scheduleShiftId) {
        const matchResult = await manager.autoMatchTimesheetToShift(timesheet)
        shiftMatched = matchResult.matched
      }

      return {
        status: 201,
        data: {
          success: true,
          timesheet,
          shiftMatched,
        }
      }
    } catch (err) {
      console.error("[api/timesheets POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create timesheet" }
      }
    }
  }
})
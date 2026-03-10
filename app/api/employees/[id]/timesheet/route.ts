import { parse, isValid } from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth/auth-api"
import { connectDB, Employee, DailyShift } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema,
  timesheetQuerySchema,
  timesheetUpdateSchema,
  timesheetListResponseSchema,
  timesheetUpdateResponseSchema
} from "@/lib/validations/employee-timesheet"
import { errorResponseSchema } from "@/lib/validations/auth"
import {
  parseTimeToMinutes,
  minutesToHours,
  formatTimeString,
  parseTimeToDate,
} from "@/lib/utils/format/time"
import type { DailyTimesheetRow } from "@/lib/types/timesheet"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/timesheet',
  summary: 'Get employee timesheet',
  description: "Get employee's daily timesheet with pagination and filtering",
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: timesheetQuerySchema
  },
  responses: {
    200: timesheetListResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!params) {
      return { status: 400, data: { error: "Employee ID is required" } };
    }

    const { id } = params!;
    const search = query?.search?.trim() ?? ""
    const limitParam = query?.limit
    const offsetParam = query?.offset
    const sortByParam = query?.sortBy?.trim().toLowerCase() ?? "date"
    const orderParam = query?.order?.trim().toLowerCase() ?? "desc"
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500) : 50
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0
    const sortBy =
      sortByParam === "totalminutes" || sortByParam === "total_minutes"
        ? "totalminutes"
        : sortByParam === "breakminutes" || sortByParam === "break_minutes"
          ? "breakminutes"
          : "date"
    const order = orderParam === "asc" ? "asc" : "desc"

    try {
      await connectDB()
      const empFilter: Record<string, unknown> = { _id: id }
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
      
      const employee = await Employee.findOne(empFilter).lean()
      if (!employee) {
        return { status: 404, data: { error: "Employee not found" } };
      }
      
      const pin = employee.pin

      // Fetch all daily shifts for this employee
      const shifts = await DailyShift.find({ pin })
        .sort({ date: -1 })
        .lean()

      const parseDateForSort = (s: string) => {
        try {
          const d1 = parse(s, "dd-MM-yyyy", new Date())
          if (isValid(d1)) return d1.getTime()
          const d2 = parse(s, "yyyy-MM-dd", new Date())
          return isValid(d2) ? d2.getTime() : 0
        } catch {
          return 0
        }
      }

      // Convert shifts to rows
      let rows: DailyTimesheetRow[] = shifts.map(shift => {
        const clockIn = formatTimeString(shift.clockIn?.time)
        const breakIn = formatTimeString(shift.breakIn?.time)
        const breakOut = formatTimeString(shift.breakOut?.time)
        const clockOut = formatTimeString(shift.clockOut?.time)

        const breakMinutes = shift.totalBreakMinutes || 0
        const totalMin = shift.totalWorkingHours ? Math.round(shift.totalWorkingHours * 60) : null

        return {
          date: shift.date instanceof Date ? shift.date.toISOString().split('T')[0] : shift.date,
          clockIn,
          breakIn,
          breakOut,
          clockOut,
          breakMinutes,
          breakHours: minutesToHours(breakMinutes),
          totalMinutes: totalMin ?? 0,
          totalHours: minutesToHours(totalMin),
          clockInImage: shift.clockIn?.image,
          clockInWhere: shift.clockIn?.lat && shift.clockIn?.lng ? `${shift.clockIn.lat},${shift.clockIn.lng}` : undefined,
          breakInImage: shift.breakIn?.image,
          breakInWhere: shift.breakIn?.lat && shift.breakIn?.lng ? `${shift.breakIn.lat},${shift.breakIn.lng}` : undefined,
          breakOutImage: shift.breakOut?.image,
          breakOutWhere: shift.breakOut?.lat && shift.breakOut?.lng ? `${shift.breakOut.lat},${shift.breakOut.lng}` : undefined,
          clockOutImage: shift.clockOut?.image,
          clockOutWhere: shift.clockOut?.lat && shift.clockOut?.lng ? `${shift.clockOut.lat},${shift.clockOut.lng}` : undefined,
          clockInSource: shift.source === "manual" ? "insert" : undefined,
          breakInSource: shift.source === "manual" ? "insert" : undefined,
          breakOutSource: shift.source === "manual" ? "insert" : undefined,
          clockOutSource: shift.source === "manual" ? "insert" : undefined,
        }
      })

      // Filter by search
      if (search) {
        const lowerSearch = search.toLowerCase()
        rows = rows.filter(r => r.date.toLowerCase().includes(lowerSearch))
      }

      // Sort
      if (sortBy === "date") {
        rows.sort((a, b) => {
          const aTime = parseDateForSort(a.date)
          const bTime = parseDateForSort(b.date)
          const result = order === "asc" ? aTime - bTime : bTime - aTime
          return result
        })
      } else if (sortBy === "totalminutes") {
        rows.sort((a, b) => {
          const diff = a.totalMinutes - b.totalMinutes
          return order === "asc" ? diff : -diff
        })
      } else if (sortBy === "breakminutes") {
        rows.sort((a, b) => {
          const diff = a.breakMinutes - b.breakMinutes
          return order === "asc" ? diff : -diff
        })
      }

      const total = rows.length
      const paginatedRows = rows.slice(offset, offset + limit)

      return {
        status: 200,
        data: {
          data: paginatedRows,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        }
      };
    } catch (err) {
      console.error("[api/employees/[id]/timesheet GET]", err)
      return { status: 500, data: { error: "Failed to fetch timesheet" } };
    }
  }
});

/** PATCH /api/employees/[id]/timesheet - Update a timesheet entry */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/timesheet',
  summary: 'Update employee timesheet',
  description: 'Update a timesheet entry for an employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: timesheetUpdateSchema
  },
  responses: {
    200: timesheetUpdateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    if (!params || !body) {
      return { status: 400, data: { error: "Employee ID and request body are required" } };
    }

    const { id } = params!;
    const { date, clockIn, breakIn, breakOut, clockOut } = body!;

    if (!date) {
      return { status: 400, data: { error: "Date is required" } };
    }

    try {
      await connectDB()

      // Verify employee exists and user has access
      const empFilter: Record<string, unknown> = { _id: id }
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]

      const employee = await Employee.findOne(empFilter).lean()
      if (!employee) {
        return { status: 404, data: { error: "Employee not found" } };
      }

      const pin = employee.pin

      // Find the shift for this date
      const shift = await DailyShift.findOne({ pin, date })

      if (!shift) {
        return { status: 404, data: { error: "Timesheet entry not found" } };
      }

      // Update times - store as Date objects
      if (clockIn !== undefined) {
        if (clockIn === "" || !clockIn) {
          shift.clockIn = undefined
        } else {
          if (!shift.clockIn) {
            shift.clockIn = { time: parseTimeToDate(clockIn), flag: false }
          } else {
            shift.clockIn.time = parseTimeToDate(clockIn)
          }
        }
      }

      if (breakIn !== undefined) {
        if (breakIn === "" || !breakIn) {
          shift.breakIn = undefined
        } else {
          if (!shift.breakIn) {
            shift.breakIn = { time: parseTimeToDate(breakIn), flag: false }
          } else {
            shift.breakIn.time = parseTimeToDate(breakIn)
          }
        }
      }

      if (breakOut !== undefined) {
        if (breakOut === "" || !breakOut) {
          shift.breakOut = undefined
        } else {
          if (!shift.breakOut) {
            shift.breakOut = { time: parseTimeToDate(breakOut), flag: false }
          } else {
            shift.breakOut.time = parseTimeToDate(breakOut)
          }
        }
      }

      if (clockOut !== undefined) {
        if (clockOut === "" || !clockOut) {
          shift.clockOut = undefined
        } else {
          if (!shift.clockOut) {
            shift.clockOut = { time: parseTimeToDate(clockOut), flag: false }
          } else {
            shift.clockOut.time = parseTimeToDate(clockOut)
          }
        }
      }

      // Recalculate break and total hours using parseTimeToMinutes (already handles HH:mm format)
      const clockInMin = parseTimeToMinutes(shift.clockIn?.time)
      const breakInMin = parseTimeToMinutes(shift.breakIn?.time)
      const breakOutMin = parseTimeToMinutes(shift.breakOut?.time)
      const clockOutMin = parseTimeToMinutes(shift.clockOut?.time)

      // Calculate break minutes
      let breakMinutes = 0
      if (breakInMin > 0 && breakOutMin > 0 && breakOutMin > breakInMin) {
        breakMinutes = breakOutMin - breakInMin
      }
      shift.totalBreakMinutes = breakMinutes

      // Calculate total working hours
      let totalMinutes = 0
      if (clockInMin > 0 && clockOutMin > 0) {
        // Handle overnight shifts (clockOut < clockIn means next day)
        if (clockOutMin < clockInMin) {
          totalMinutes = (1440 - clockInMin) + clockOutMin - breakMinutes
        } else {
          totalMinutes = clockOutMin - clockInMin - breakMinutes
        }
      }
      shift.totalWorkingHours = totalMinutes > 0 ? totalMinutes / 60 : 0

      // Mark as edited (not from punch)
      shift.source = "manual"

      await shift.save()

      return {
        status: 200,
        data: {
          success: true,
          message: "Timesheet updated successfully"
        }
      };
    } catch (err) {
      console.error("[api/employees/[id]/timesheet PATCH]", err)
      return { status: 500, data: { error: "Failed to update timesheet" } };
    }
  }
});

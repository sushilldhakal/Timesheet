import { NextRequest, NextResponse } from "next/server"
import { format, parse, isValid, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee, DailyShift, Timesheet } from "@/lib/db"
import { formatDate as formatDateDisplay } from "@/lib/utils/date-format"

function parseTimeToMinutes(t?: string): number {
  if (!t || typeof t !== "string" || !t.trim()) return 0
  const s = t.trim()
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    return h * 60 + m
  }
  const d = new Date(s)
  if (isNaN(d.getTime())) return 0
  return d.getHours() * 60 + d.getMinutes()
}

function minutesToHours(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return "—"
  if (min < 0) return "0h"
  if (min === 0) return "0h"
  const h = Math.floor(min / 60)
  const remainder = Math.round(min % 60)
  if (remainder === 0) return `${h}h`
  return `${h}h ${remainder}m`
}

/**
 * Convert Date object or string to HH:mm format string.
 */
function formatTimeString(t?: Date | string): string {
  if (!t) return ""
  if (t instanceof Date) {
    const hours = t.getHours().toString().padStart(2, "0")
    const minutes = t.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }
  return String(t)
}

/** Build list of Date objects between start and end (inclusive) for querying. */
function dateRangeToDateObjects(start: Date, end: Date): Date[] {
  const out: Date[] = []
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0) // Start of day
  
  const endDate = new Date(end)
  endDate.setHours(0, 0, 0, 0) // Start of day
  
  while (cur <= endDate) {
    out.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export interface DashboardTimesheetRow {
  date: string
  employeeId: string
  name: string
  pin: string
  comment: string
  employer: string
  role: string
  location: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
  breakMinutes: number
  breakHours: string
  totalMinutes: number
  totalHours: string
  clockInDeviceId?: string
  clockInDeviceLocation?: string
  breakInDeviceId?: string
  breakInDeviceLocation?: string
  breakOutDeviceId?: string
  breakOutDeviceLocation?: string
  clockOutDeviceId?: string
  clockOutDeviceLocation?: string
}

/** GET /api/timesheets - Aggregated timesheets with filters */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get("startDate")?.trim()
  const endParam = searchParams.get("endDate")?.trim()
  const employeeIds = searchParams.getAll("employeeId").map((s) => s.trim()).filter(Boolean)
  const employers = searchParams.getAll("employer").map((s) => s.trim()).filter(Boolean)
  const locations = searchParams.getAll("location").map((s) => s.trim()).filter(Boolean)
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")
  const sortByParam = searchParams.get("sortBy")?.trim() ?? "date"
  const orderParam = searchParams.get("order")?.trim()?.toLowerCase() ?? "asc"
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500) : 50
  const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0
  const order = orderParam === "desc" ? "desc" : "asc"
  const validSortColumns = [
    "date", "name", "comment", "employer", "role", "location",
    "clockIn", "breakIn", "breakOut", "clockOut", "breakHours", "totalHours",
  ]
  const sortBy = validSortColumns.includes(sortByParam) ? sortByParam : "date"

  let start: Date
  let end: Date
  if (startParam && endParam) {
    start = new Date(startParam)
    end = new Date(endParam)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate or endDate" },
        { status: 400 }
      )
    }
    if (start > end) {
      return NextResponse.json(
        { error: "startDate must be before or equal to endDate" },
        { status: 400 }
      )
    }
  } else {
    const now = new Date()
    start = startOfWeek(now, { weekStartsOn: 1 })
    end = endOfWeek(now, { weekStartsOn: 1 })
  }

  const dateStrings = dateRangeToDateObjects(start, end)
  if (dateStrings.length > 366) {
    return NextResponse.json(
      { error: "Date range too large (max 366 days)" },
      { status: 400 }
    )
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
        const e = emp as { _id: unknown; pin: string; name?: string; employer?: string[]; role?: string[]; location?: string[]; comment?: string }
        const locFilter = employeeLocationFilter(ctx.userLocations)
        if (Object.keys(locFilter).length > 0) {
          const empLocs = Array.isArray(e.location) ? e.location : []
          const userLocs = ctx.userLocations ?? []
          const inLocation = empLocs.some((loc) => userLocs.includes(String(loc).trim()))
          if (!inLocation) continue
        }
        pins.push(e.pin)
        employeeMap.set(e.pin, {
          id: String(e._id),
          name: e.name ?? "",
          employer: Array.isArray(e.employer) ? e.employer.join(", ") : "",
          role: Array.isArray(e.role) ? e.role.join(", ") : "",
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
      for (const emp of employees) {
        const e = emp as { _id: unknown; pin: string; name?: string; employer?: string[]; role?: string[]; location?: string[]; comment?: string }
        employeeMap.set(e.pin, {
          id: String(e._id),
          name: e.name ?? "",
          employer: Array.isArray(e.employer) ? e.employer.join(", ") : "",
          role: Array.isArray(e.role) ? e.role.join(", ") : "",
          location: Array.isArray(e.location) ? e.location.join(", ") : "",
          comment: e.comment ?? "",
        })
      }
    }

    // Query using Date range with UTC normalization
    // MongoDB stores dates in UTC, so we need to query with UTC dates
    const startUTC = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0))
    const endUTC = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999))
    
    const query: { pin: { $in: string[] }; date: { $gte: Date; $lte: Date } } = {
      pin: { $in: pins },
      date: { 
        $gte: startUTC,
        $lte: endUTC
      },
    }
    const shifts = await DailyShift.find(query).lean()

    const rows: DashboardTimesheetRow[] = []
    for (const shift of shifts) {
      const pin = String(shift.pin ?? "")
      const shiftDate = shift.date
      if (!pin || !shiftDate) continue

      const meta = employeeMap.get(pin)

      // Format date for display using configured format
      const date = formatDateDisplay(shiftDate)

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
        // Try parsing with configured format first
        const d1 = parse(s, process.env.NEXT_PUBLIC_DATE_FORMAT || process.env.DATE_FORMAT || "dd-MM-yyyy", new Date())
        if (isValid(d1)) return d1.getTime()
        // Fallback to ISO format
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
      } else if (sortBy === "totalHours" || sortBy === "totalMinutes") {
        cmp = a.totalMinutes - b.totalMinutes
      } else if (sortBy === "breakHours" || sortBy === "breakMinutes") {
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
    const total = rows.length
    const paginated = rows.slice(offset, offset + limit)

    return NextResponse.json({
      timesheets: paginated,
      total,
      limit,
      offset,
      totalWorkingMinutes,
      totalBreakMinutes,
      totalWorkingHours: minutesToHours(totalWorkingMinutes),
      totalBreakHours: minutesToHours(totalBreakMinutes),
    })
  } catch (err) {
    console.error("[api/timesheets GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch timesheets" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/timesheets
 * Create a new timesheet entry with automatic shift matching
 * 
 * Request body:
 * {
 *   pin: string (required)
 *   type: string (required) - in, out, break, endBreak
 *   date: string (required) - YYYY-MM-DD format
 *   time: string (optional) - HH:mm format or ISO string
 *   image: string (optional)
 *   lat: string (optional)
 *   lng: string (optional)
 *   where: string (optional)
 *   flag: boolean (optional)
 *   working: string (optional)
 *   source: string (optional) - insert, update
 *   deviceId: string (optional)
 *   deviceLocation: string (optional)
 *   breakSource: string (optional) - punched, auto_rule, none
 *   breakRuleRef: string (optional)
 *   scheduleShiftId: string (optional) - Manual shift ID override
 * }
 */
export async function POST(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
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
    } = body

    // Validate required fields
    if (!pin || !type || !date) {
      return NextResponse.json(
        { error: "pin, type, and date are required" },
        { status: 400 }
      )
    }

    // Validate type
    if (!["in", "out", "break", "endBreak"].includes(type)) {
      return NextResponse.json(
        { error: "type must be one of: in, out, break, endBreak" },
        { status: 400 }
      )
    }

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      )
    }

    await connectDB()

    // Import TimesheetManager
    const { TimesheetManager } = await import("@/lib/managers/timesheet-manager")
    const manager = new TimesheetManager()

    // Prepare timesheet data
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

    // Add manual shift ID if provided
    if (scheduleShiftId) {
      const mongoose = await import("mongoose")
      if (!mongoose.Types.ObjectId.isValid(scheduleShiftId)) {
        return NextResponse.json(
          { error: "Invalid scheduleShiftId format" },
          { status: 400 }
        )
      }
      timesheetData.scheduleShiftId = new mongoose.Types.ObjectId(scheduleShiftId)
    }

    // Create timesheet
    const timesheet = await Timesheet.create(timesheetData)

    // Attempt automatic shift matching for clock-in entries
    let shiftMatched = false
    if (type === "in" && !scheduleShiftId) {
      const matchResult = await manager.autoMatchTimesheetToShift(timesheet)
      shiftMatched = matchResult.matched
    }

    return NextResponse.json({
      success: true,
      timesheet,
      shiftMatched,
    }, { status: 201 })
  } catch (err) {
    console.error("[api/timesheets POST]", err)
    return NextResponse.json(
      { error: "Failed to create timesheet" },
      { status: 500 }
    )
  }
}

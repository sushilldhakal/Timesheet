import { NextRequest, NextResponse } from "next/server"
import { parse, isValid } from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee, DailyShift } from "@/lib/db"
import { employeeIdParamSchema } from "@/lib/validation/employee"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Parse time string to minutes since midnight.
 */
function parseTimeToMinutes(t?: string): number {
  if (!t || typeof t !== "string" || !t.trim()) return 0
  const s = t.trim()
  
  // ISO format
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes()
    }
  } catch {}
  
  // HH:mm format
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    return h * 60 + m
  }
  
  return 0
}

/** Format minutes to "Xh Ym" */
function minutesToHours(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return "—"
  if (min < 0) return "0h"
  if (min === 0) return "0h"
  const h = Math.floor(min / 60)
  const remainder = Math.round(min % 60)
  if (remainder === 0) return `${h}h`
  return `${h}h ${remainder}m`
}

export type TimesheetTimeSource = "insert" | "update"

export interface DailyTimesheetRow {
  date: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
  breakMinutes: number
  breakHours: string
  totalMinutes: number
  totalHours: string
  clockInImage?: string
  clockInWhere?: string
  breakInImage?: string
  breakInWhere?: string
  breakOutImage?: string
  breakOutWhere?: string
  clockOutImage?: string
  clockOutWhere?: string
  clockInSource?: TimesheetTimeSource
  breakInSource?: TimesheetTimeSource
  breakOutSource?: TimesheetTimeSource
  clockOutSource?: TimesheetTimeSource
}

/** GET /api/employees/[id]/timesheet - Get employee's daily timesheet */
export async function GET(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = (await context.params).id
  const parsed = employeeIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")
  const sortByParam = searchParams.get("sortBy")?.trim().toLowerCase() ?? "date"
  const orderParam = searchParams.get("order")?.trim().toLowerCase() ?? "desc"
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 500) : 50
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
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
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
      const clockIn = shift.clockIn?.time || ""
      const breakIn = shift.breakIn?.time || ""
      const breakOut = shift.breakOut?.time || ""
      const clockOut = shift.clockOut?.time || ""

      const breakMinutes = shift.totalBreakMinutes || 0
      const totalMin = shift.totalWorkingHours ? Math.round(shift.totalWorkingHours * 60) : null

      return {
        date: shift.date,
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
        return order === "asc" ? aTime - bTime : bTime - aTime
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

    return NextResponse.json({
      data: paginatedRows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (err) {
    console.error("[api/employees/[id]/timesheet GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch timesheet" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { parse, isValid } from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee, Timesheet } from "@/lib/db"
import { employeeIdParamSchema } from "@/lib/validation/employee"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Parse time string to minutes since midnight.
 * Handles both old format ("Wednesday, December 31, 2025 1:57 PM") and new format ("08:25" or "08:25:00").
 */
function parseTimeToMinutes(t?: string): number {
  if (!t || typeof t !== "string" || !t.trim()) return 0
  const s = t.trim()
  // New format: HH:mm or HH:mm:ss
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    return h * 60 + m
  }
  // Old format: full date-time string (e.g. "Wednesday, December 31, 2025 1:57 PM")
  const d = new Date(s)
  if (isNaN(d.getTime())) return 0
  return d.getHours() * 60 + d.getMinutes()
}

/** Normalize time string to "HH:mm" for comparison (form sends "HH:mm", DB may store full date string). */
function normalizeTimeToHHMM(t?: string): string {
  const min = parseTimeToMinutes(t)
  if (min === 0 && !(t && String(t).trim())) return ""
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Format minutes to "Xh Ym". Handles null/NaN. Returns "—" for null/incomplete, "0h" for 0. */
function minutesToHours(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return "—"
  const m = min
  if (m < 0) return "0h"
  if (m === 0) return "0h"
  const h = Math.floor(m / 60)
  const remainder = Math.round(m % 60)
  if (remainder === 0) return `${h}h`
  return `${h}h ${remainder}m`
}

/** "insert" = time was manually added (no punch image/location). "update" = time from real punch (has image or location) or admin edited. */
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
  clockInLocation?: string
  breakInImage?: string
  breakInWhere?: string
  breakInLocation?: string
  breakOutImage?: string
  breakOutWhere?: string
  breakOutLocation?: string
  clockOutImage?: string
  clockOutWhere?: string
  clockOutLocation?: string
  /** Red when manually added (no punch); green when from punch or edited. */
  clockInSource?: TimesheetTimeSource
  breakInSource?: TimesheetTimeSource
  breakOutSource?: TimesheetTimeSource
  clockOutSource?: TimesheetTimeSource
}

/** GET /api/employees/[id]/timesheet - Get employee's daily timesheet (aggregated) */
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

    const raw = await Timesheet.find({ pin })
      .sort({ date: -1, time: 1 })
      .lean()

    // Aggregate by date; keep image, where, working (location name), and source (insert/update from admin edit) per punch type
    const byDate = new Map<
      string,
      {
        in?: string
        break?: string
        endBreak?: string
        out?: string
        inImage?: string
        inWhere?: string
        inWorking?: string
        inSource?: TimesheetTimeSource
        breakImage?: string
        breakWhere?: string
        breakWorking?: string
        breakSource?: TimesheetTimeSource
        endBreakImage?: string
        endBreakWhere?: string
        endBreakWorking?: string
        endBreakSource?: TimesheetTimeSource
        outImage?: string
        outWhere?: string
        outWorking?: string
        outSource?: TimesheetTimeSource
      }
    >()
    const getImage = (r: { image?: string }) => (r.image ? String(r.image).trim() : undefined)
    const getWhere = (r: { where?: string }) => (r.where ? String(r.where).trim() : undefined)
    const getWorkingLocation = (r: { working?: string }): string | undefined => {
      const s = String(r.working ?? "").trim()
      // If working field contains "insert" or "update", it's a source marker (old data)
      if (s.toLowerCase() === "insert" || s.toLowerCase() === "update") return undefined
      // Otherwise it's a location name
      return s || undefined
    }
    const getSource = (r: { source?: string; working?: string }): TimesheetTimeSource | undefined => {
      // First check the source field (new way)
      const src = String(r.source ?? "").trim().toLowerCase()
      if (src === "insert" || src === "update") return src
      // Fallback to working field (old way for backward compatibility)
      const wrk = String(r.working ?? "").trim().toLowerCase()
      if (wrk === "insert" || wrk === "update") return wrk
      return undefined
    }
    for (const r of raw) {
      const d = String(r.date ?? "")
      if (!d) continue
      const entry = byDate.get(d) ?? {}
      const t = String(r.time ?? "").trim()
      const type = String(r.type ?? "").toLowerCase().replace(/\s/g, "")
      const rec = r as { image?: string; where?: string; working?: string; source?: string }
      if (type === "in") {
        entry.in = t
        const img = getImage(rec)
        const where = getWhere(rec)
        const working = getWorkingLocation(rec)
        if (img) entry.inImage = img
        if (where) entry.inWhere = where
        if (working) entry.inWorking = working
        const src = getSource(rec)
        if (src) entry.inSource = src
      } else if (type === "break") {
        entry.break = t
        const img = getImage(rec)
        const where = getWhere(rec)
        const working = getWorkingLocation(rec)
        if (img) entry.breakImage = img
        if (where) entry.breakWhere = where
        if (working) entry.breakWorking = working
        const src = getSource(rec)
        if (src) entry.breakSource = src
      } else if (type === "endbreak") {
        entry.endBreak = t
        const img = getImage(rec)
        const where = getWhere(rec)
        const working = getWorkingLocation(rec)
        if (img) entry.endBreakImage = img
        if (where) entry.endBreakWhere = where
        if (working) entry.endBreakWorking = working
        const src = getSource(rec)
        if (src) entry.endBreakSource = src
      } else if (type === "out") {
        entry.out = t
        const img = getImage(rec)
        const where = getWhere(rec)
        const working = getWorkingLocation(rec)
        if (img) entry.outImage = img
        if (where) entry.outWhere = where
        if (working) entry.outWorking = working
        const src = getSource(rec)
        if (src) entry.outSource = src
      }
      byDate.set(d, entry)
    }

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

    let rows: DailyTimesheetRow[] = []
    for (const [date, entry] of byDate.entries()) {
      const clockIn = entry.in ?? ""
      const breakIn = entry.break ?? ""
      const breakOut = entry.endBreak ?? ""
      const clockOut = entry.out ?? ""

      const inMin = parseTimeToMinutes(clockIn)
      const outMin = parseTimeToMinutes(clockOut)
      const biMin = parseTimeToMinutes(breakIn)
      const boMin = parseTimeToMinutes(breakOut)
      const breakMinutes = Math.max(0, boMin - biMin)
      const totalMin = outMin > 0 && inMin > 0 ? Math.max(0, outMin - inMin - breakMinutes) : null

      // Source comes from DB: set by admin on Edit (insert = was empty, added; update = had value, changed).
      rows.push({
        date,
        clockIn,
        breakIn,
        breakOut,
        clockOut,
        breakMinutes,
        breakHours: minutesToHours(breakMinutes),
        totalMinutes: totalMin ?? 0,
        totalHours: minutesToHours(totalMin),
        clockInImage: entry.inImage,
        clockInWhere: entry.inWhere,
        clockInLocation: entry.inWorking,
        breakInImage: entry.breakImage,
        breakInWhere: entry.breakWhere,
        breakInLocation: entry.breakWorking,
        breakOutImage: entry.endBreakImage,
        breakOutWhere: entry.endBreakWhere,
        breakOutLocation: entry.endBreakWorking,
        clockOutImage: entry.outImage,
        clockOutWhere: entry.outWhere,
        clockOutLocation: entry.outWorking,
        clockInSource: entry.inSource,
        breakInSource: entry.breakSource,
        breakOutSource: entry.endBreakSource,
        clockOutSource: entry.outSource,
      })
    }

    // Sort by date, totalMinutes, or breakMinutes; asc or desc
    const sortMul = order === "asc" ? 1 : -1
    rows.sort((a, b) => {
      if (sortBy === "date") {
        return (parseDateForSort(a.date) - parseDateForSort(b.date)) * sortMul
      }
      if (sortBy === "totalminutes") {
        return (a.totalMinutes - b.totalMinutes) * sortMul
      }
      if (sortBy === "breakminutes") {
        return (a.breakMinutes - b.breakMinutes) * sortMul
      }
      return (parseDateForSort(a.date) - parseDateForSort(b.date)) * sortMul
    })

    // Client-side filter by search (date) for server consistency with pagination
    if (search) {
      rows = rows.filter(
        (r) =>
          r.date.toLowerCase().includes(search.toLowerCase()) ||
          r.clockIn.toLowerCase().includes(search.toLowerCase()) ||
          r.clockOut.toLowerCase().includes(search.toLowerCase())
      )
    }

    const total = rows.length
    const paginated = rows.slice(offset, offset + limit)

    return NextResponse.json({
      timesheets: paginated,
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error("[api/employees/[id]/timesheet GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch timesheet" },
      { status: 500 }
    )
  }
}

const timesheetUpdateSchema = {
  date: (v: unknown) => typeof v === "string" && v.trim().length > 0,
  clockIn: (v: unknown) => typeof v === "string",
  breakIn: (v: unknown) => typeof v === "string",
  breakOut: (v: unknown) => typeof v === "string",
  clockOut: (v: unknown) => typeof v === "string",
}

/** PATCH /api/employees/[id]/timesheet - Edit individual punch records. Update existing doc (working: "update") or create new (working: "insert"). */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = (await context.params).id
  const parsed = employeeIdParamSchema.safeParse({ id })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { date, clockIn, breakIn, breakOut, clockOut } = body
    if (!timesheetUpdateSchema.date(date)) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    await connectDB()
    const empFilter: Record<string, unknown> = { _id: id }
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
    const employee = await Employee.findOne(empFilter).lean()
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }
    const pin = employee.pin
    const d = String(date).trim()

    const newIn = String(clockIn ?? "").trim()
    const newBreak = String(breakIn ?? "").trim()
    const newBreakOut = String(breakOut ?? "").trim()
    const newOut = String(clockOut ?? "").trim()

    const types: { type: string; time: string }[] = [
      { type: "in", time: newIn },
      { type: "break", time: newBreak },
      { type: "endBreak", time: newBreakOut },
      { type: "out", time: newOut },
    ]

    const normalizeType = (t: string) =>
      String(t ?? "").toLowerCase().replace(/\s/g, "")
    const dayDocs = await Timesheet.find({ pin, date: d }).lean()

    for (const { type, time } of types) {
      const existing = dayDocs.find(
        (doc) => normalizeType(doc.type) === normalizeType(type)
      )
      const previousTime = existing ? String(existing.time ?? "").trim() : ""
      const newTime = String(time ?? "").trim()
      // Only touch this punch if the value actually changed (normalize so "06:00" matches DB "6:00 AM" etc.)
      if (normalizeTimeToHHMM(previousTime) === normalizeTimeToHHMM(newTime)) continue

      if (newTime) {
        if (existing) {
          await Timesheet.updateOne(
            { _id: existing._id },
            { $set: { time: newTime, source: "update" } }
          )
        } else {
          await Timesheet.create({
            pin,
            date: d,
            type,
            time: newTime,
            source: "insert",
          })
        }
      } else {
        if (existing) {
          await Timesheet.deleteOne({ _id: existing._id })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[api/employees/[id]/timesheet PATCH]", err)
    return NextResponse.json(
      { error: "Failed to update timesheet" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { format, parse, isValid, startOfWeek, endOfWeek } from "date-fns"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB, Employee, Timesheet } from "@/lib/db"

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

/** Build list of dd-MM-yyyy dates between start and end (inclusive). */
function dateRangeToDDMM(start: Date, end: Date): string[] {
  const out: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    out.push(format(cur, "dd-MM-yyyy"))
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
}

/** GET /api/timesheets - Aggregated timesheets with filters */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get("startDate")?.trim()
  const endParam = searchParams.get("endDate")?.trim()
  const employeeId = searchParams.get("employeeId")?.trim() || undefined
  const employer = searchParams.get("employer")?.trim() || undefined
  const location = searchParams.get("location")?.trim() || undefined
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

  const dateStrings = dateRangeToDDMM(start, end)
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

    if (employeeId) {
      const emp = await Employee.findById(employeeId).lean()
      if (!emp) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }
      const e = emp as { _id: unknown; pin: string; name?: string; employer?: string[]; hire?: string; role?: string[]; location?: string[]; site?: string; comment?: string }
      pins = [e.pin]
      employeeMap.set(e.pin, {
        id: String(e._id),
        name: e.name ?? "",
        employer: Array.isArray(e.employer) ? e.employer.join(", ") : e.hire ?? "",
        role: Array.isArray(e.role) ? e.role.join(", ") : "",
        location: Array.isArray(e.location) ? e.location.join(", ") : e.site ?? "",
        comment: e.comment ?? "",
      })
    } else {
      const filter: Record<string, unknown> = {}
      const andConditions: Record<string, unknown>[] = []
      if (employer) {
        andConditions.push({
          $or: [
            { employer: { $in: [employer] } },
            { hire: employer },
          ],
        })
      }
      if (location) {
        andConditions.push({
          $or: [
            { location: { $in: [location] } },
            { site: location },
          ],
        })
      }
      if (andConditions.length > 0) {
        filter.$and = andConditions
      }
      const employees = await Employee.find(filter).lean()
      pins = employees.map((e) => (e as { pin: string }).pin)
      for (const emp of employees) {
        const e = emp as { _id: unknown; pin: string; name?: string; employer?: string[]; hire?: string; role?: string[]; location?: string[]; site?: string; comment?: string }
        employeeMap.set(e.pin, {
          id: String(e._id),
          name: e.name ?? "",
          employer: Array.isArray(e.employer) ? e.employer.join(", ") : e.hire ?? "",
          role: Array.isArray(e.role) ? e.role.join(", ") : "",
          location: Array.isArray(e.location) ? e.location.join(", ") : e.site ?? "",
          comment: e.comment ?? "",
        })
      }
    }

    const query: { pin: { $in: string[] }; date: { $in: string[] } } = {
      pin: { $in: pins },
      date: { $in: dateStrings },
    }
    const raw = await Timesheet.find(query).sort({ date: 1, time: 1 }).lean()

    const byPinAndDate = new Map<
      string,
      {
        in?: string
        break?: string
        endBreak?: string
        out?: string
      }
    >()
    for (const r of raw) {
      const pin = String(r.pin ?? "")
      const d = String(r.date ?? "")
      if (!pin || !d) continue
      const key = `${pin}|${d}`
      const entry = byPinAndDate.get(key) ?? {}
      const t = String(r.time ?? "").trim()
      const type = String(r.type ?? "").toLowerCase().replace(/\s/g, "")
      if (type === "in") entry.in = t
      else if (type === "break") entry.break = t
      else if (type === "endbreak") entry.endBreak = t
      else if (type === "out") entry.out = t
      byPinAndDate.set(key, entry)
    }

    const rows: DashboardTimesheetRow[] = []
    for (const [key, entry] of byPinAndDate.entries()) {
      const [pin, date] = key.split("|")
      const meta = employeeMap.get(pin)

      const clockIn = entry.in ?? ""
      const breakIn = entry.break ?? ""
      const breakOut = entry.endBreak ?? ""
      const clockOut = entry.out ?? ""

      const inMin = parseTimeToMinutes(clockIn)
      const outMin = parseTimeToMinutes(clockOut)
      const biMin = parseTimeToMinutes(breakIn)
      const boMin = parseTimeToMinutes(breakOut)
      const breakMinutes = Math.max(0, boMin - biMin)
      const totalMin =
        outMin > 0 && inMin > 0 ? Math.max(0, outMin - inMin - breakMinutes) : 0

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
      })
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

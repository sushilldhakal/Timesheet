import { NextResponse } from "next/server"
import {
  format,
  parse,
  isValid,
  subDays,
  startOfWeek,
  endOfWeek,
  getDay,
} from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee, Timesheet } from "@/lib/db"

const DATE_FMT = "dd-MM-yyyy"
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function parseTimeToMinutes(t?: string): number {
  if (!t || typeof t !== "string" || !t.trim()) return 0
  const s = t.trim()
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  const d = new Date(s)
  return isNaN(d.getTime()) ? 0 : d.getHours() * 60 + d.getMinutes()
}

/** Parse time string to 24h hour (0–23). Handles "15:25", "3:25 PM", "Thursday, February 12, 2026 3:25 PM". */
function parseTimeToHour24(t?: string): number | null {
  if (!t || typeof t !== "string" || !t.trim()) return null
  const s = t.trim()
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.getHours()
  const match = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const ampm = match[3]?.toUpperCase()
  if (ampm === "PM" && hour >= 1 && hour <= 11) hour += 12
  if (ampm === "AM" && hour === 12) hour = 0
  return hour
}

function parseDate(s: string): Date | null {
  try {
    const d1 = parse(s, DATE_FMT, new Date())
    if (isValid(d1)) return d1
    const d2 = parse(s, "yyyy-MM-dd", new Date())
    return isValid(d2) ? d2 : null
  } catch {
    return null
  }
}

function dateRangeToDDMM(start: Date, end: Date): string[] {
  const out: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    out.push(format(cur, DATE_FMT))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/** Normalize employer string to dashboard category key */
function employerToCategory(employer: string): string {
  const lower = (employer || "").toLowerCase()
  if (lower.includes("dmx")) return "dmx"
  if (lower.includes("vic logistics") || lower.includes("viclogistics")) return "vicLogistics"
  if (lower.includes("m&m") || lower.includes("m and m")) return "mandm"
  if (lower.includes("subcontractor") || lower.includes("subcontract")) return "subcontractors"
  return "employees"
}

/** Normalize role for staffing chart (first role or "Other") */
function normalizeRole(role: string): string {
  const r = (role || "").trim().toLowerCase()
  if (r.includes("sorter")) return "sorter"
  if (r.includes("rfms")) return "rfms"
  if (r.includes("depot hand") || r.includes("depot")) return "depotHand"
  if (r.includes("customer service")) return "customerServices"
  return "other"
}

export async function GET(request: Request) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const timelineDateParam = searchParams.get("timelineDate")?.trim() // yyyy-MM-dd from client

  try {
    await connectDB()
    const now = new Date()
    let timelineDateStr = format(now, DATE_FMT)
    if (timelineDateParam) {
      const d = parse(timelineDateParam, "yyyy-MM-dd", new Date())
      if (isValid(d)) timelineDateStr = format(d, DATE_FMT)
    }

    // ─── Employees (filtered by user location) + pin filter for timesheet queries ─
    const empFilter: Record<string, unknown> = {}
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
    const employees = await Employee.find(empFilter).lean()
    const allowedPins = ctx.userLocations && ctx.userLocations.length > 0
      ? (employees as { pin?: string }[]).map((e) => e.pin ?? "").filter(Boolean)
      : null
    const timesheetFilter = (base: Record<string, unknown>): Record<string, unknown> =>
      allowedPins && allowedPins.length > 0 ? { ...base, pin: { $in: allowedPins } } : base

    // ─── 1. Daily Timeline: punches by hour and type (clock in, break in, break out, clock out) ─
    const todayPunches = await Timesheet.find(timesheetFilter({ date: timelineDateStr })).lean()
    type HourCounts = { clockIn: number; breakIn: number; breakOut: number; clockOut: number }
    const byHour: Record<string, HourCounts> = {}
    for (let h = 6; h <= 20; h++) {
      byHour[`${h.toString().padStart(2, "0")}:00`] = { clockIn: 0, breakIn: 0, breakOut: 0, clockOut: 0 }
    }
    for (const row of todayPunches) {
      const t = String(row.time ?? "").trim()
      const hour24 = parseTimeToHour24(t)
      if (hour24 == null || hour24 < 6 || hour24 > 20) continue
      const key = `${hour24.toString().padStart(2, "0")}:00`
      const entry = byHour[key]
      if (!entry) continue
      const type = String(row.type ?? "").toLowerCase().replace(/\s/g, "")
      if (type === "in") entry.clockIn += 1
      else if (type === "break") entry.breakIn += 1
      else if (type === "endbreak") entry.breakOut += 1
      else if (type === "out") entry.clockOut += 1
    }
    const dailyTimeline = Object.entries(byHour)
      .map(([hour, counts]) => ({ hour, ...counts }))
      .sort((a, b) => a.hour.localeCompare(b.hour))

    // ─── 2. Location Distribution: from employees ───────────────────────────
    const locationCounts: Record<string, number> = {}
    for (const e of employees) {
      const locs = Array.isArray(e.location) ? e.location : e.site ? [e.site] : []
      if (locs.length === 0) locationCounts["Unassigned"] = (locationCounts["Unassigned"] ?? 0) + 1
      else for (const loc of locs) {
        const name = String(loc || "Unassigned").trim() || "Unassigned"
        locationCounts[name] = (locationCounts[name] ?? 0) + 1
      }
    }
    const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]
    const locationDistribution = Object.entries(locationCounts).map(([name], i) => ({
      name,
      value: locationCounts[name],
      fill: chartColors[i % chartColors.length],
    })).sort((a, b) => b.value - a.value)

    // ─── 3. Attendance by day of week (last 4 weeks) ───────────────────────
    const fourWeeksAgo = subDays(now, 28)
    const dateStrings = dateRangeToDDMM(fourWeeksAgo, now)
    const punchesByDay = await Timesheet.find(timesheetFilter({
      date: { $in: dateStrings },
      type: { $in: ["in", "In"] },
    })).lean()
    const dayCounts: Record<string, Set<string>> = {}
    DAY_NAMES.forEach((d) => (dayCounts[d] = new Set()))
    for (const row of punchesByDay) {
      const d = parseDate(String(row.date))
      if (d) {
        const dayName = DAY_NAMES[getDay(d)]
        dayCounts[dayName].add(String(row.pin))
      }
    }
    const attendanceByDay = DAY_NAMES.map((day) => ({
      day,
      count: dayCounts[day]?.size ?? 0,
    }))

    // ─── 4. Weekly trends: totalHours, activeEmployees, attendanceRate ─────
    const weeksCount = 12
    const weekStarts: Date[] = []
    for (let i = 0; i < weeksCount; i++) {
      const d = subDays(now, (weeksCount - 1 - i) * 7)
      weekStarts.push(startOfWeek(d, { weekStartsOn: 1 }))
    }
    const totalEmployees = employees.length
    const weeklyData: { totalHours: number; activeEmployees: number; attendanceRate: number }[] = []
    for (let w = 0; w < weekStarts.length; w++) {
      const start = weekStarts[w]
      const end = endOfWeek(start, { weekStartsOn: 1 })
      const rangeStr = dateRangeToDDMM(start, end)
      const weekPunches = await Timesheet.find(timesheetFilter({ date: { $in: rangeStr } })).sort({ date: 1, time: 1 }).lean()
      const byPinDate = new Map<string, { in?: string; out?: string }>()
      for (const r of weekPunches) {
        const key = `${r.pin}|${r.date}`
        const entry = byPinDate.get(key) ?? {}
        const type = String(r.type ?? "").toLowerCase().replace(/\s/g, "")
        const time = String(r.time ?? "").trim()
        if (type === "in") entry.in = time
        else if (type === "out") entry.out = time
        byPinDate.set(key, entry)
      }
      let totalMinutes = 0
      const activePins = new Set<string>()
      for (const [key, entry] of byPinDate) {
        const pin = key.split("|")[0]
        activePins.add(pin)
        const inMin = parseTimeToMinutes(entry.in)
        const outMin = parseTimeToMinutes(entry.out)
        if (outMin > 0 && inMin > 0) totalMinutes += Math.max(0, outMin - inMin)
      }
      const attendanceRate = totalEmployees > 0 ? Math.round((activePins.size / totalEmployees) * 100) : 0
      weeklyData.push({
        totalHours: Math.round(totalMinutes / 60),
        activeEmployees: activePins.size,
        attendanceRate,
      })
    }
    const weeklyMonthly = weekStarts.map((start, i) => {
      const end = endOfWeek(start, { weekStartsOn: 1 })
      return {
        period: `${format(start, "dd MMM")}-${format(end, "dd MMM")}`,
        totalHours: weeklyData[i]?.totalHours ?? 0,
        activeEmployees: weeklyData[i]?.activeEmployees ?? 0,
        attendanceRate: weeklyData[i]?.attendanceRate ?? 0,
      }
    })

    // ─── 5. Role-based staffing: count by role (last 7 days, no morning/evening) ─
    const sevenDaysStr = dateRangeToDDMM(subDays(now, 7), now)
    const recentPunches = await Timesheet.find(timesheetFilter({
      date: { $in: sevenDaysStr },
      type: { $in: ["in", "In"] },
    })).lean()
    const pinToEmployee = new Map<string, { role: string[]; employer: string[] }>()
    for (const e of employees) {
      const emp = e as { pin: string; role?: string[]; employer?: string[] }
      pinToEmployee.set(emp.pin, {
        role: Array.isArray(emp.role) ? emp.role : [],
        employer: Array.isArray(emp.employer) ? emp.employer : [],
      })
    }
    const roleLabels: Record<string, string> = {
      sorter: "Sorter",
      rfms: "RFMS",
      depotHand: "Depot Hand",
      customerServices: "Customer Services",
      other: "Other",
    }
    const countByRole: Record<string, Set<string>> = {}
    const roleKeys = ["sorter", "rfms", "depotHand", "customerServices", "other"]
    roleKeys.forEach((r) => { countByRole[r] = new Set() })
    for (const row of recentPunches) {
      const pin = String(row.pin ?? "")
      const meta = pinToEmployee.get(pin)
      const roles = meta?.role?.length ? meta.role : ["Other"]
      const firstRole = normalizeRole(roles[0] ?? "Other")
      const k = roleKeys.includes(firstRole) ? firstRole : "other"
      countByRole[k].add(pin)
    }
    const roleStaffingByRole = roleKeys.map((k) => ({
      name: roleLabels[k],
      count: countByRole[k]?.size ?? 0,
    })).filter((r) => r.count > 0)
    if (roleStaffingByRole.length === 0) {
      roleStaffingByRole.push({ name: "No data", count: 0 })
    }

    // ─── 6. Employer/Contractor mix over last 6 months ──────────────────────
    const monthsCount = 6
    const employerMix: { month: string; employees: number; subcontractors: number; dmx: number; vicLogistics: number; mandm: number }[] = []
    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      const monthStr = format(monthStart, "MMM yyyy")
      const rangeStr = dateRangeToDDMM(monthStart, monthEnd)
      const pinsActiveInMonth = await Timesheet.distinct("pin", timesheetFilter({ date: { $in: rangeStr } }))
      const counts = { employees: 0, subcontractors: 0, dmx: 0, vicLogistics: 0, mandm: 0 }
      for (const pin of pinsActiveInMonth) {
        const meta = pinToEmployee.get(pin)
        const employers = meta?.employer?.length ? meta.employer : ["Employee"]
        const cat = employerToCategory(employers[0] ?? "Employee")
        if (cat in counts) (counts as Record<string, number>)[cat]++
        else counts.employees++
      }
      employerMix.push({
        month: monthStr,
        ...counts,
      })
    }

    return NextResponse.json({
      dailyTimeline,
      locationDistribution,
      attendanceByDay,
      weeklyMonthly,
      roleStaffingByRole,
      employerMix,
    })
  } catch (err) {
    console.error("[api/dashboard/stats GET]", err)
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    )
  }
}

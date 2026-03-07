import { NextResponse } from "next/server"
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  getDay,
} from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth/auth-api"
import { connectDB, Employee, DailyShift } from "@/lib/db"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Parse time string or Date to 24h hour (0–23). */
function parseTimeToHour24(t?: string | Date): number | null {
  if (!t) return null
  if (t instanceof Date) {
    return !isNaN(t.getTime()) ? t.getHours() : null
  }
  if (typeof t !== "string" || !t.trim()) return null
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

/** Get unique employer categories from employees with colors */
async function getEmployerCategoriesWithColors(employees: unknown[]): Promise<Array<{ name: string; color?: string }>> {
  const { Category } = await import("@/lib/db")
  const employerNames = new Set<string>()
  for (const e of employees) {
    const emp = e as { employer?: string[] }
    const employers = Array.isArray(emp.employer) ? emp.employer : []
    for (const employer of employers) {
      if (employer && employer.trim()) {
        employerNames.add(employer.trim())
      }
    }
  }
  
  // Fetch employer categories with colors
  const categories = await Category.find({
    name: { $in: Array.from(employerNames) },
    type: "employer"
  }).select("name color").lean()
  
  const categoryMap = new Map(
    categories.map(cat => [cat.name, cat.color])
  )
  
  return Array.from(employerNames).sort().map(name => ({
    name,
    color: categoryMap.get(name)
  }))
}

/** Normalize employer to category key */
function normalizeEmployerCategory(employer: string): string {
  const lower = (employer || "").toLowerCase().trim()
  if (!lower) return "uncategorized"
  // Return the employer name as-is, just normalized
  return employer.trim()
}

/** Normalize role for staffing chart */
function normalizeRole(role: string): string {
  const r = (role || "").trim().toLowerCase()
  if (r.includes("cashier")) return "cashier"
  if (r.includes("sorter")) return "sorter"
  if (r.includes("rfms")) return "rfms"
  if (r.includes("depot hand") || r.includes("depot")) return "depotHand"
  if (r.includes("customer service")) return "customerServices"
  if (r.includes("driver")) return "driver"
  if (r.includes("supervisor")) return "supervisor"
  if (r.includes("manager")) return "manager"
  return "other"
}

export async function GET(request: Request) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const timelineDateParam = searchParams.get("timelineDate")?.trim()

  try {
    await connectDB()
    const now = new Date()

    // Parse timeline date
    let timelineDate = new Date(now)
    if (timelineDateParam) {
      const d = new Date(timelineDateParam)
      if (!isNaN(d.getTime())) timelineDate = d
    }
    timelineDate.setHours(0, 0, 0, 0)
    const timelineDateEnd = new Date(timelineDate)
    timelineDateEnd.setHours(23, 59, 59, 999)

    // Get employees with location filtering
    const empFilter: Record<string, unknown> = {}
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
    const employees = await Employee.find(empFilter).lean()
    
    const allowedPins = ctx.userLocations && ctx.userLocations.length > 0
      ? (employees as { pin?: string }[]).map((e) => e.pin ?? "").filter(Boolean)
      : null
    
    const timesheetFilter = (base: Record<string, unknown>): Record<string, unknown> =>
      allowedPins && allowedPins.length > 0 ? { ...base, pin: { $in: allowedPins } } : base

    // ─── 1. Daily Timeline ─────────────────────────────────────────────────
    const todayShifts = await DailyShift.find(timesheetFilter({ 
      date: { $gte: timelineDate, $lte: timelineDateEnd } 
    })).lean()
    
    type HourCounts = { clockIn: number; breakIn: number; breakOut: number; clockOut: number }
    const byHour: Record<string, HourCounts> = {}
    for (let h = 6; h <= 20; h++) {
      byHour[`${h.toString().padStart(2, "0")}:00`] = { clockIn: 0, breakIn: 0, breakOut: 0, clockOut: 0 }
    }
    
    for (const shift of todayShifts) {
      if (shift.clockIn?.time) {
        const hour24 = parseTimeToHour24(shift.clockIn.time)
        if (hour24 != null && hour24 >= 6 && hour24 <= 20) {
          const key = `${hour24.toString().padStart(2, "0")}:00`
          if (byHour[key]) byHour[key].clockIn += 1
        }
      }
      if (shift.breakIn?.time) {
        const hour24 = parseTimeToHour24(shift.breakIn.time)
        if (hour24 != null && hour24 >= 6 && hour24 <= 20) {
          const key = `${hour24.toString().padStart(2, "0")}:00`
          if (byHour[key]) byHour[key].breakIn += 1
        }
      }
      if (shift.breakOut?.time) {
        const hour24 = parseTimeToHour24(shift.breakOut.time)
        if (hour24 != null && hour24 >= 6 && hour24 <= 20) {
          const key = `${hour24.toString().padStart(2, "0")}:00`
          if (byHour[key]) byHour[key].breakOut += 1
        }
      }
      if (shift.clockOut?.time) {
        const hour24 = parseTimeToHour24(shift.clockOut.time)
        if (hour24 != null && hour24 >= 6 && hour24 <= 20) {
          const key = `${hour24.toString().padStart(2, "0")}:00`
          if (byHour[key]) byHour[key].clockOut += 1
        }
      }
    }
    
    const dailyTimeline = Object.entries(byHour)
      .map(([hour, counts]) => ({ hour, ...counts }))
      .sort((a, b) => a.hour.localeCompare(b.hour))

    // ─── 2. Location Distribution ──────────────────────────────────────────
    const locationCounts: Record<string, number> = {}
    for (const e of employees) {
      const locs = Array.isArray(e.location) ? e.location : []
      if (locs.length === 0) {
        locationCounts["Unassigned"] = (locationCounts["Unassigned"] ?? 0) + 1
      } else {
        for (const loc of locs) {
          const name = String(loc || "Unassigned").trim() || "Unassigned"
          locationCounts[name] = (locationCounts[name] ?? 0) + 1
        }
      }
    }
    
    const chartColors = [
      "hsl(var(--chart-1))", 
      "hsl(var(--chart-2))", 
      "hsl(var(--chart-3))", 
      "hsl(var(--chart-4))", 
      "hsl(var(--chart-5))"
    ]
    const locationDistribution = Object.entries(locationCounts)
      .map(([name], i) => ({
        name,
        value: locationCounts[name],
        fill: chartColors[i % chartColors.length],
      }))
      .sort((a, b) => b.value - a.value)

    // ─── 3. Attendance by Day (last 4 weeks) ──────────────────────────────
    const fourWeeksAgo = subDays(now, 28)
    fourWeeksAgo.setHours(0, 0, 0, 0)
    const nowEnd = new Date(now)
    nowEnd.setHours(23, 59, 59, 999)
    
    const shiftsForAttendance = await DailyShift.find(timesheetFilter({
      date: { $gte: fourWeeksAgo, $lte: nowEnd },
      clockIn: { $exists: true },
    })).lean()
    
    const dayCounts: Record<string, Set<string>> = {}
    DAY_NAMES.forEach((d) => (dayCounts[d] = new Set()))
    
    for (const shift of shiftsForAttendance) {
      const d = shift.date instanceof Date ? shift.date : new Date(shift.date)
      if (!isNaN(d.getTime())) {
        const dayName = DAY_NAMES[getDay(d)]
        dayCounts[dayName].add(String(shift.pin))
      }
    }
    
    const attendanceByDay = DAY_NAMES.map((day) => ({
      day,
      count: dayCounts[day]?.size ?? 0,
    }))

    // ─── 4. Weekly Trends ──────────────────────────────────────────────────
    const weeksCount = 12
    const weekStarts: Date[] = []
    for (let i = 0; i < weeksCount; i++) {
      const d = subDays(now, (weeksCount - 1 - i) * 7)
      weekStarts.push(startOfWeek(d, { weekStartsOn: 1 }))
    }
    
    const totalEmployees = employees.length
    const weeklyData: { totalHours: number; activeEmployees: number; attendanceRate: number }[] = []
    
    for (let w = 0; w < weekStarts.length; w++) {
      const start = new Date(weekStarts[w])
      start.setHours(0, 0, 0, 0)
      const end = endOfWeek(start, { weekStartsOn: 1 })
      end.setHours(23, 59, 59, 999)
      
      const weekShifts = await DailyShift.find(timesheetFilter({ 
        date: { $gte: start, $lte: end } 
      })).lean()
      
      let totalHours = 0
      const activePins = new Set<string>()
      
      for (const shift of weekShifts) {
        if (shift.clockIn) {
          activePins.add(String(shift.pin))
        }
        if (shift.totalWorkingHours && shift.totalWorkingHours > 0) {
          totalHours += shift.totalWorkingHours
        }
      }
      
      const attendanceRate = totalEmployees > 0 
        ? Math.round((activePins.size / totalEmployees) * 100) 
        : 0
      
      weeklyData.push({
        totalHours: Math.round(totalHours),
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

    // ─── 5. Role-based Staffing (last 7 days) ─────────────────────────────
    const sevenDaysAgo = subDays(now, 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    
    const recentShifts = await DailyShift.find(timesheetFilter({
      date: { $gte: sevenDaysAgo, $lte: nowEnd },
      clockIn: { $exists: true },
    })).lean()
    
    // Get role assignments with populated role data
    const { EmployeeRoleAssignment } = await import("@/lib/db")
    const roleAssignments = await EmployeeRoleAssignment.find({
      isActive: true,
    }).populate("roleId").populate("employeeId").lean()
    
    // Map employee ID to role names and colors
    const employeeIdToRoles = new Map<string, Array<{ name: string; color?: string }>>()
    for (const assignment of roleAssignments) {
      const empId = String((assignment.employeeId as any)?._id || assignment.employeeId)
      const roleName = (assignment.roleId as any)?.name || "Other"
      const roleColor = (assignment.roleId as any)?.color
      if (!employeeIdToRoles.has(empId)) {
        employeeIdToRoles.set(empId, [])
      }
      employeeIdToRoles.get(empId)!.push({ name: roleName, color: roleColor })
    }
    
    // Map PIN to roles using employee data
    const pinToRoles = new Map<string, Array<{ name: string; color?: string }>>()
    for (const e of employees) {
      const emp = e as any
      const empId = String(emp._id)
      const pin = emp.pin
      const roles = employeeIdToRoles.get(empId) || []
      if (roles.length > 0) {
        pinToRoles.set(pin, roles)
      }
    }
    
    // Collect unique roles with their colors
    const roleColorMap = new Map<string, string>()
    for (const roles of pinToRoles.values()) {
      for (const role of roles) {
        if (role.color && !roleColorMap.has(role.name)) {
          roleColorMap.set(role.name, role.color)
        }
      }
    }
    
    const countByRole = new Map<string, Set<string>>()
    
    for (const shift of recentShifts) {
      const pin = String(shift.pin ?? "")
      const roles = pinToRoles.get(pin)
      if (roles && roles.length > 0) {
        const roleName = roles[0].name
        if (!countByRole.has(roleName)) {
          countByRole.set(roleName, new Set())
        }
        countByRole.get(roleName)!.add(pin)
      }
    }
    
    const roleStaffingByRole = Array.from(countByRole.entries())
      .map(([name, pins]) => ({
        name,
        count: pins.size,
        color: roleColorMap.get(name),
      }))
      .sort((a, b) => b.count - a.count)
    
    if (roleStaffingByRole.length === 0) {
      roleStaffingByRole.push({ name: "No data", count: 0, color: undefined })
    }

    // ─── 6. Employer Mix (last 6 months) ──────────────────────────────────
    const monthsCount = 6
    const employerCategoriesWithColors = await getEmployerCategoriesWithColors(employees)
    const employerCategories = employerCategoriesWithColors.map(c => c.name)
    const employerMix: { month: string; [key: string]: number | string }[] = []
    
    // Build pin to employer map
    const pinToEmployer = new Map<string, string[]>()
    for (const e of employees) {
      const emp = e as { pin: string; employer?: string[] }
      pinToEmployer.set(emp.pin, Array.isArray(emp.employer) ? emp.employer : [])
    }
    
    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthStart.setHours(0, 0, 0, 0)
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      monthEnd.setHours(23, 59, 59, 999)
      const monthStr = format(monthStart, "MMM yyyy")
      
      const pinsActiveInMonth = await DailyShift.distinct("pin", timesheetFilter({ 
        date: { $gte: monthStart, $lte: monthEnd } 
      }))
      
      const counts: Record<string, number> = {}
      employerCategories.forEach(cat => counts[cat] = 0)
      
      for (const pin of pinsActiveInMonth) {
        const employers = pinToEmployer.get(pin) || ["Uncategorized"]
        const cat = normalizeEmployerCategory(employers[0] ?? "Uncategorized")
        if (counts[cat] !== undefined) {
          counts[cat]++
        } else {
          counts[cat] = 1
        }
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
      employerCategories: employerCategoriesWithColors,
    })
  } catch (err) {
    console.error("[api/dashboard/stats GET]", err)
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    )
  }
}

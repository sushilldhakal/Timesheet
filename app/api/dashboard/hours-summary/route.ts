import { NextRequest, NextResponse } from "next/server"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee, DailyShift } from "@/lib/db"

/** GET /api/dashboard/hours-summary?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd
 *  Returns most hours (top staff, overtime) and least hours (< 38h, min first). */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get("startDate")?.trim()
  const endParam = searchParams.get("endDate")?.trim()

  const now = new Date()
  const defaultStart = startOfWeek(now, { weekStartsOn: 1 })
  const defaultEnd = endOfWeek(now, { weekStartsOn: 1 })
  const start = startParam ? new Date(startParam) : defaultStart
  const end = endParam ? new Date(endParam) : defaultEnd

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return NextResponse.json(
      { error: "Invalid startDate or endDate (use yyyy-MM-dd)" },
      { status: 400 }
    )
  }

  try {
    await connectDB()
    
    // Query DailyShift with date range
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 366) {
      return NextResponse.json({ error: "Date range too large" }, { status: 400 })
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

    return NextResponse.json({
      mostHours,
      leastHours,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    })
  } catch (err) {
    console.error("[api/dashboard/hours-summary GET]", err)
    return NextResponse.json(
      { error: "Failed to load hours summary" },
      { status: 500 }
    )
  }
}

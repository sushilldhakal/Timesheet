import { NextResponse } from "next/server"
import { format } from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth/auth-api"
import { connectDB, Employee, DailyShift } from "@/lib/db"

const INACTIVE_DAYS = 100
const DATE_FMT = "dd-MM-yyyy"

export interface InactiveEmployeeRow {
  id: string
  name: string
  pin: string
  lastPunchDate: string | null
  daysInactive: number
}

/** GET /api/dashboard/inactive-employees - Employees with no punch in the last 100 days */
export async function GET() {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()

    // Group by pin and get the most recent date for each employee
    const grouped = await DailyShift.aggregate<{ _id: string; lastDate: Date }>([
      { $group: { _id: "$pin", lastDate: { $max: "$date" } } },
    ])

    const lastPunchMap = new Map<string, { date: Date; dateStr: string }>()
    for (const x of grouped) {
      if (!x._id || !x.lastDate) continue
      const pin = String(x._id)
      const date = x.lastDate instanceof Date ? x.lastDate : new Date(x.lastDate)
      if (!isNaN(date.getTime())) {
        lastPunchMap.set(pin, { 
          date, 
          dateStr: format(date, DATE_FMT) 
        })
      }
    }

    const empFilter: Record<string, unknown> = {}
    const locFilter = employeeLocationFilter(ctx.userLocations)
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter]
    const allEmployees = await Employee.find(empFilter).lean()
    const inactive: InactiveEmployeeRow[] = []
    const now = new Date()

    for (const e of allEmployees) {
      const emp = e as { _id: unknown; pin: string; name?: string }
      const pin = emp.pin ?? ""
      const entry = lastPunchMap.get(pin) ?? null
      let daysInactive: number
      if (!entry || isNaN(entry.date.getTime())) {
        daysInactive = INACTIVE_DAYS + 1
      } else {
        daysInactive = Math.floor((now.getTime() - entry.date.getTime()) / (24 * 60 * 60 * 1000))
      }
      if (daysInactive >= INACTIVE_DAYS) {
        inactive.push({
          id: String(emp._id),
          name: emp.name ?? "",
          pin,
          lastPunchDate: entry ? format(entry.date, DATE_FMT) : null,
          daysInactive,
        })
      }
    }

    inactive.sort((a, b) => b.daysInactive - a.daysInactive)

    return NextResponse.json({
      inactiveEmployees: inactive,
      thresholdDays: INACTIVE_DAYS,
    })
  } catch (err) {
    console.error("[api/dashboard/inactive-employees GET]", err)
    return NextResponse.json(
      { error: "Failed to load inactive employees" },
      { status: 500 }
    )
  }
}

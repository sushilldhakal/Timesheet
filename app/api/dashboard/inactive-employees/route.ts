import { NextResponse } from "next/server"
import { format } from "date-fns"
import { getAuthWithUserLocations, employeeLocationFilter } from "@/lib/auth-api"
import { connectDB, Employee, Timesheet } from "@/lib/db"

const INACTIVE_DAYS = 100
const DATE_FMT = "dd-MM-yyyy"

/** Parse dd-MM-yyyy or yyyy-MM-dd string to Date. Returns null if invalid. */
function parseDateStr(s: unknown): Date | null {
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s
  if (s == null || typeof s !== "string") return null
  const trimmed = s.trim()
  if (!trimmed) return null
  const parts = trimmed.split("-")
  if (parts.length !== 3) {
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? null : d
  }
  const a = parseInt(parts[0], 10)
  const b = parseInt(parts[1], 10)
  const c = parseInt(parts[2], 10)
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null
  let day: number, month: number, year: number
  if (a <= 31 && b <= 12 && c >= 1900 && c <= 2100) {
    day = a
    month = b - 1
    year = c
  } else if (c <= 31 && b <= 12 && a >= 1900 && a <= 2100) {
    year = a
    month = b - 1
    day = c
  } else return null
  const d = new Date(year, month, day)
  return isNaN(d.getTime()) ? null : d
}

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

    // Group by pin and collect all date strings; we'll parse in Node so we handle
    // dd-MM-yyyy vs string comparison and any mixed/invalid formats safely.
    const grouped = await Timesheet.aggregate<{ _id: string; dates: string[] }>([
      { $group: { _id: "$pin", dates: { $addToSet: "$date" } } },
    ])

    const lastPunchMap = new Map<string, { date: Date; dateStr: string }>()
    for (const x of grouped) {
      if (!x._id || !Array.isArray(x.dates)) continue
      const pin = String(x._id)
      let maxDate: Date | null = null
      let maxStr: string | null = null
      for (const dStr of x.dates) {
        const parsed = parseDateStr(dStr)
        if (parsed && (!maxDate || parsed.getTime() > maxDate.getTime())) {
          maxDate = parsed
          maxStr = typeof dStr === "string" ? dStr : format(parsed, DATE_FMT)
        }
      }
      if (maxDate && maxStr) lastPunchMap.set(pin, { date: maxDate, dateStr: maxStr })
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

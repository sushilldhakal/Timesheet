import { NextRequest, NextResponse } from "next/server"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB, Employee, Timesheet } from "@/lib/db"

const DATE_FMT = "dd-MM-yyyy"

function parseTimeToMinutes(t?: string): number {
  if (!t || typeof t !== "string" || !t.trim()) return 0
  const s = t.trim()
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  const d = new Date(s)
  return isNaN(d.getTime()) ? 0 : d.getHours() * 60 + d.getMinutes()
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

/** GET /api/dashboard/hours-summary?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd
 *  Returns most hours (top staff, overtime) and least hours (< 38h, min first). */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
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
    const dateStrings = dateRangeToDDMM(start, end)
    if (dateStrings.length > 366) {
      return NextResponse.json({ error: "Date range too large" }, { status: 400 })
    }

    const raw = await Timesheet.find({ date: { $in: dateStrings } })
      .sort({ date: 1, time: 1 })
      .lean()

    const byPinDate = new Map<string, { in?: string; out?: string }>()
    for (const r of raw) {
      const key = `${r.pin}|${r.date}`
      const entry = byPinDate.get(key) ?? {}
      const type = String(r.type ?? "").toLowerCase().replace(/\s/g, "")
      const time = String(r.time ?? "").trim()
      if (type === "in") entry.in = time
      else if (type === "out") entry.out = time
      byPinDate.set(key, entry)
    }

    const minutesByPin = new Map<string, number>()
    for (const [key, entry] of byPinDate) {
      const pin = key.split("|")[0]
      const inMin = parseTimeToMinutes(entry.in)
      const outMin = parseTimeToMinutes(entry.out)
      const mins = outMin > 0 && inMin > 0 ? Math.max(0, outMin - inMin) : 0
      minutesByPin.set(pin, (minutesByPin.get(pin) ?? 0) + mins)
    }

    const employees = await Employee.find({}).lean()
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

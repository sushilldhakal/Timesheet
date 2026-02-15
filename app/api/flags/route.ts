import { NextRequest, NextResponse } from "next/server"
import { format, parse, isValid, subDays } from "date-fns"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB, Employee, Timesheet } from "@/lib/db"

export type FlagIssueType = "no_image" | "no_location" | "no_image_no_location"

function last30DaysDDMM(): string[] {
  const end = new Date()
  const start = subDays(end, 29)
  const out: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    out.push(format(cur, "dd-MM-yyyy"))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function getIssueType(hasImage: boolean, hasLocation: boolean): FlagIssueType | null {
  if (!hasImage && !hasLocation) return "no_image_no_location"
  if (!hasImage) return "no_image"
  if (!hasLocation) return "no_location"
  return null
}

export interface FlagRow {
  id: string
  employeeId: string
  date: string
  pin: string
  name: string
  type: string
  typeLabel: string
  hasImage: boolean
  hasLocation: boolean
  issueType: FlagIssueType
}

const TYPE_LABELS: Record<string, string> = {
  in: "Clock In",
  out: "Clock Out",
  break: "Break In",
  endBreak: "End Break",
}

/** GET /api/flags?filter=no_image|no_location|no_image_no_location&limit=50&offset=0 - Flagged punches (last 30 days) */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter")?.trim() as FlagIssueType | null
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")
  const sortByParam = searchParams.get("sortBy")?.trim() ?? "date"
  const orderParam = searchParams.get("order")?.trim()?.toLowerCase() ?? "desc"
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200) : 50
  const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0
  const order = orderParam === "asc" ? "asc" : "desc"
  const validSortColumns = ["date", "name", "pin", "typeLabel", "hasImage", "hasLocation", "issueType"]
  const sortBy = validSortColumns.includes(sortByParam) ? sortByParam : "date"

  const validFilters: FlagIssueType[] = ["no_image", "no_location", "no_image_no_location"]
  const filterType =
    filter && validFilters.includes(filter) ? filter : null

  try {
    await connectDB()
    const dateStrings = last30DaysDDMM()

    const raw = await Timesheet.find({
      date: { $in: dateStrings },
      flag: true,
    })
      .sort({ date: -1, time: 1 })
      .lean()

    const pins = [...new Set(raw.map((r) => String(r.pin ?? "")))].filter(Boolean)
    const employees = await Employee.find({ pin: { $in: pins } }).lean()
    const pinToName = new Map<string, string>()
    const pinToId = new Map<string, string>()
    employees.forEach((e) => {
      const p = e as { _id: unknown; pin: string; name?: string }
      pinToName.set(p.pin, p.name ?? "")
      pinToId.set(p.pin, String(p._id))
    })

    const rows: FlagRow[] = []
    for (const r of raw) {
      const imageStr = String(r.image ?? "").trim()
      const whereStr = String(r.where ?? "").trim()
      const hasImage = imageStr.length > 0
      const hasLocation = whereStr.length > 0
      const issueType = getIssueType(hasImage, hasLocation)
      if (!issueType) continue
      if (filterType) {
        if (filterType === "no_image" && hasImage) continue
        if (filterType === "no_location" && hasLocation) continue
        if (filterType === "no_image_no_location" && issueType !== "no_image_no_location") continue
      }

      rows.push({
        id: `${r.pin}-${r.date}-${r.type}-${String(r.time ?? "")}`,
        employeeId: pinToId.get(String(r.pin ?? "")) ?? "",
        date: String(r.date ?? ""),
        pin: String(r.pin ?? ""),
        name: pinToName.get(String(r.pin ?? "")) ?? "",
        type: String(r.type ?? ""),
        typeLabel: TYPE_LABELS[String(r.type ?? "").toLowerCase()] ?? String(r.type ?? ""),
        hasImage,
        hasLocation,
        issueType,
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
      } else if (sortBy === "name" || sortBy === "pin" || sortBy === "typeLabel" || sortBy === "issueType") {
        const aVal = sortBy === "name" ? a.name : sortBy === "pin" ? a.pin : sortBy === "typeLabel" ? a.typeLabel : a.issueType
        const bVal = sortBy === "name" ? b.name : sortBy === "pin" ? b.pin : sortBy === "typeLabel" ? b.typeLabel : b.issueType
        cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""))
      } else if (sortBy === "hasImage" || sortBy === "hasLocation") {
        const aVal = sortBy === "hasImage" ? a.hasImage : a.hasLocation
        const bVal = sortBy === "hasImage" ? b.hasImage : b.hasLocation
        cmp = (aVal ? 1 : 0) - (bVal ? 1 : 0)
      } else {
        cmp = 0
      }
      if (cmp !== 0) return cmp * mul
      return (parseDateForSort(a.date) - parseDateForSort(b.date)) * mul
    })

    const total = rows.length
    const paginated = rows.slice(offset, offset + limit)

    return NextResponse.json({
      items: paginated,
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error("[api/flags GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch flags" },
      { status: 500 }
    )
  }
}

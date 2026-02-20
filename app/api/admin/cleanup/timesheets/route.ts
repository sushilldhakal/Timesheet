import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { connectDB, Timesheet } from "@/lib/db"

/** POST /api/admin/cleanup/timesheets - Delete timesheet records older than date (admin only). Body: { beforeDate: "YYYY-MM-DD" } */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminOrSuperAdmin(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const beforeDate = typeof body.beforeDate === "string" ? body.beforeDate.trim() : ""
    if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeDate)) {
      return NextResponse.json(
        { error: "Invalid beforeDate. Use YYYY-MM-DD format." },
        { status: 400 }
      )
    }

    await connectDB()
    const result = await Timesheet.deleteMany({ date: { $lt: beforeDate } })

    return NextResponse.json({ deleted: result.deletedCount ?? 0 })
  } catch (err) {
    console.error("[api/admin/cleanup/timesheets]", err)
    return NextResponse.json(
      { error: "Failed to delete timesheets" },
      { status: 500 }
    )
  }
}

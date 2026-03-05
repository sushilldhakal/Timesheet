import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { ActivityLog } from "@/lib/db/schemas/activity-log"

/** GET /api/admin/activity-logs - Get activity logs */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || "storage"
    const limit = parseInt(searchParams.get("limit") || "10")
    const page = parseInt(searchParams.get("page") || "1")
    const skip = (page - 1) * limit

    await connectDB()
    
    const logs = await ActivityLog.find({ category })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Check if there are more logs
    const total = await ActivityLog.countDocuments({ category })
    const hasMore = skip + logs.length < total

    return NextResponse.json({ logs, hasMore, total, page })
  } catch (error) {
    console.error("[GET /api/admin/activity-logs]", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}

/** POST /api/admin/activity-logs - Create activity log */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { action, details, status, category = "storage" } = body

    if (!action || !details || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    await connectDB()
    
    const log = await ActivityLog.create({
      action,
      details,
      status,
      userId: auth.sub,
      category,
    })

    return NextResponse.json({ log })
  } catch (error) {
    console.error("[POST /api/admin/activity-logs]", error)
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 })
  }
}

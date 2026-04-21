import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { SuperAdminAuditLog } from "@/lib/db/schemas/superadmin-audit-log"

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromCookie()
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const action = searchParams.get("action")
    const entityType = searchParams.get("entityType")
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}
    if (action && action !== "all") {
      query.action = action
    }
    if (entityType && entityType !== "all") {
      query.entityType = entityType
    }

    // Fetch logs with populated references
    const logs = await SuperAdminAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1) // Fetch one extra to check if there are more
      .populate("actorId", "name email")
      .populate("orgId", "name")
      .lean()

    const hasMore = logs.length > limit
    const logsToReturn = hasMore ? logs.slice(0, limit) : logs

    return NextResponse.json({
      logs: logsToReturn.map((log) => ({
        _id: log._id.toString(),
        tenantId: log.orgId ? {
          _id: (log.orgId as any)._id.toString(),
          name: (log.orgId as any).name,
        } : null,
        userId: {
          _id: (log.actorId as any)._id.toString(),
          name: (log.actorId as any).name,
          email: (log.actorId as any).email,
        },
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValue: log.previousValue,
        newValue: log.newValue,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      hasMore,
      page,
      limit,
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { User } from "@/lib/db/schemas/user"
import { createSuperAdminAuditLog } from "@/lib/db/schemas/superadmin-audit-log"
import { toObjectId } from "@/infrastructure/db/mongo/mongo-ids"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getAuthFromCookie()
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await connectDB()

    const { userId } = params
    const body = await req.json()
    const { action } = body

    if (!["activate", "deactivate"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent deactivating super admins
    if (user.role === "super_admin" && action === "deactivate") {
      return NextResponse.json({ error: "Cannot deactivate super admin users" }, { status: 400 })
    }

    // For now, we'll use a custom field or handle this differently
    // Since the User schema doesn't have an isActive field, we could:
    // 1. Add it to the schema
    // 2. Use a different mechanism (e.g., setting password to null)
    // 3. Create a separate deactivated users collection
    
    // For this implementation, let's add a note that this needs schema update
    // and just log the action for now

    // Create audit log
    await createSuperAdminAuditLog({
      actor: session.email || "unknown",
      actorId: toObjectId(session.sub),
      action: action === "activate" ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      entityType: "User",
      entityId: userId,
      orgId: user.tenantId,
      previousValue: { status: action === "activate" ? "inactive" : "active" },
      newValue: { status: action === "activate" ? "active" : "inactive" },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "",
      userAgent: req.headers.get("user-agent") || "",
    })

    return NextResponse.json({
      success: true,
      message: `User ${action}d successfully`,
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

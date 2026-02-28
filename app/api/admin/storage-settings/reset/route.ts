import { NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { StorageSettings } from "@/lib/db/schemas/storage-settings"

/** DELETE /api/admin/storage-settings/reset - Clear all storage settings (for migration) */
export async function DELETE() {
  try {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    await StorageSettings.deleteMany({})

    return NextResponse.json({ 
      success: true, 
      message: "All storage settings cleared. Please re-enter your credentials." 
    })
  } catch (error) {
    console.error("[DELETE /api/admin/storage-settings/reset]", error)
    return NextResponse.json({ error: "Failed to reset settings" }, { status: 500 })
  }
}

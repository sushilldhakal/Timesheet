import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin, isSuperAdmin } from "@/lib/config/roles"
import { SystemSettingsService } from "@/lib/services/superadmin/system-settings-service"

/**
 * GET /api/admin/mail-settings
 * Get mail settings (read-only for admin, full for superadmin)
 */
export async function GET() {
  try {
    const session = await getAuthFromCookie()
    if (!session || !isAdminOrSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await SystemSettingsService.get()

    if (isSuperAdmin(session.role)) {
      // Superadmin gets full masked settings
      return NextResponse.json({
        fromEmail: settings?.mailerooFromEmail || "",
        fromName: settings?.mailerooFromName || "",
        apiKey: settings?.mailerooApiKey || "••••••••",
        isConfigured: !!(settings?.mailerooApiKey && settings?.mailerooFromEmail),
      })
    } else {
      // Admin gets read-only view (no API key)
      return NextResponse.json({
        fromEmail: settings?.mailerooFromEmail || "",
        fromName: settings?.mailerooFromName || "",
        isConfigured: !!(settings?.mailerooApiKey && settings?.mailerooFromEmail),
      })
    }
  } catch (error: any) {
    console.error("Error fetching mail settings:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/admin/mail-settings
 * Update mail settings (superadmin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthFromCookie()
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden - Superadmin only" }, { status: 403 })
    }

    const body = await request.json()
    const { apiKey, fromEmail, fromName } = body

    await SystemSettingsService.save({
      mailerooApiKey: apiKey,
      mailerooFromEmail: fromEmail,
      mailerooFromName: fromName,
      updatedBy: session.sub,
    })

    return NextResponse.json({ message: "Mail settings updated successfully" })
  } catch (error: any) {
    console.error("Error updating mail settings:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
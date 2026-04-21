import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/config/roles";
import { SystemSettingsService } from "@/lib/services/superadmin/system-settings-service";

/**
 * POST /api/superadmin/system-settings/test-r2
 * Test R2 connection
 */
export async function POST() {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await SystemSettingsService.testR2Connection();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error testing R2 connection:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

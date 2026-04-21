import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/config/roles";
import { SystemSettingsService } from "@/lib/services/superadmin/system-settings-service";
import { z } from "zod";

const TestMailSchema = z.object({
  testEmail: z.string().email(),
});

/**
 * POST /api/superadmin/system-settings/test-mail
 * Send test email
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { testEmail } = TestMailSchema.parse(body);

    const result = await SystemSettingsService.testMailConnection(testEmail);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error testing mail connection:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

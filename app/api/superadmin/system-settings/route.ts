import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/config/roles";
import { SystemSettingsService } from "@/lib/services/superadmin/system-settings-service";
import { z } from "zod";

const SystemSettingsSchema = z.object({
  r2AccountId: z.string().optional(),
  r2AccessKeyId: z.string().optional(),
  r2SecretAccessKey: z.string().optional(),
  r2BucketName: z.string().optional(),
  r2PublicUrl: z.string().optional(),
  mailerooApiKey: z.string().optional(),
  mailerooFromEmail: z.string().email().optional(),
  mailerooFromName: z.string().optional(),
  defaultStorageQuotaBytes: z.number().positive().optional(),
  defaultEmailQuotaMonthly: z.number().positive().optional(),
});

/**
 * GET /api/superadmin/system-settings
 * Get system settings (secrets masked)
 */
export async function GET() {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await SystemSettingsService.get();
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/system-settings
 * Save system settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = SystemSettingsSchema.parse(body);

    await SystemSettingsService.save({
      ...validated,
      updatedBy: session.sub,
    });

    return NextResponse.json({ message: "Settings saved successfully" });
  } catch (error: any) {
    console.error("Error saving system settings:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

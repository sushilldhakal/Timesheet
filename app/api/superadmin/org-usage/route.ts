import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/config/roles";
import { QuotaService } from "@/lib/services/superadmin/quota-service";

/**
 * GET /api/superadmin/org-usage
 * Get usage stats for all organizations
 */
export async function GET() {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const usage = await QuotaService.getAllOrgsUsage();

    // Format the response
    const formatted = usage.map((item) => ({
      orgId: item.org._id.toString(),
      orgName: item.org.name,
      storageUsedBytes: item.storageQuota?.usedBytes || 0,
      storageQuotaBytes: item.storageQuota?.quotaBytes || 0,
      emailSentCount: item.emailUsage?.sentCount || 0,
      emailQuota: item.emailUsage?.quotaMonthly || 0,
      emailPeriodStart: item.emailUsage?.periodStart || null,
    }));

    return NextResponse.json({ organizations: formatted });
  } catch (error: any) {
    console.error("Error fetching org usage:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

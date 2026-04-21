import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isAdminOrSuperAdmin } from "@/lib/config/roles";
import { QuotaService } from "@/lib/services/superadmin/quota-service";

/**
 * GET /api/admin/email-usage
 * Get email usage for current organization
 */
export async function GET() {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isAdminOrSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = session.tenantId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization ID not found" }, { status: 400 });
    }

    const usage = await QuotaService.getEmailUsage(orgId);
    const remaining = Math.max(0, usage.quotaMonthly - usage.sentCount);

    // Calculate period end (last day of current month)
    const periodStart = new Date(usage.periodStart);
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);

    return NextResponse.json({
      sentCount: usage.sentCount,
      quotaMonthly: usage.quotaMonthly,
      remaining,
      periodStart: usage.periodStart,
      periodEnd,
    });
  } catch (error: any) {
    console.error("Error fetching email usage:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

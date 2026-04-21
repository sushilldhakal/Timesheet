import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isAdminOrSuperAdmin } from "@/lib/config/roles";
import { QuotaService } from "@/lib/services/superadmin/quota-service";

/**
 * GET /api/admin/storage-quota
 * Get storage quota for current organization
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

    const quota = await QuotaService.getStorageQuota(orgId);
    const usedPercent = quota.quotaBytes > 0 ? (quota.usedBytes / quota.quotaBytes) * 100 : 0;

    return NextResponse.json({
      usedBytes: quota.usedBytes,
      quotaBytes: quota.quotaBytes,
      usedPercent: Math.round(usedPercent * 100) / 100,
    });
  } catch (error: any) {
    console.error("Error fetching storage quota:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

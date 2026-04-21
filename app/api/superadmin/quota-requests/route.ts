import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/config/roles";
import { QuotaRequestRepo } from "@/lib/db/queries/quota-request";
import { QuotaRequestStatus } from "@/lib/db/schemas/quota-request";

/**
 * GET /api/superadmin/quota-requests?status=pending|approved|denied
 * List all quota requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as QuotaRequestStatus | null;

    let requests;
    if (status && ["pending", "approved", "denied"].includes(status)) {
      requests = await QuotaRequestRepo.findByStatus(status);
    } else {
      requests = await QuotaRequestRepo.findAll();
    }

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("Error fetching quota requests:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

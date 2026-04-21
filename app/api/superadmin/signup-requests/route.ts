import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/config/roles";
import { OrgSignupService } from "@/lib/services/org-signup/org-signup-service";
import type { OrgSignupRequestStatus } from "@/lib/db/schemas/org-signup-request";

/**
 * GET /api/superadmin/org-requests?status=pending|approved|rejected
 * List all org signup requests (superadmin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as OrgSignupRequestStatus | null;

    let requests;
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      requests = await OrgSignupService.listRequests(status);
    } else {
      requests = await OrgSignupService.listRequests();
    }

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("[org-requests GET]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

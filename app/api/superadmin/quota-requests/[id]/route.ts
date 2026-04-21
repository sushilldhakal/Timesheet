import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/config/roles";
import { QuotaService } from "@/lib/services/superadmin/quota-service";
import { z } from "zod";

const ReviewSchema = z.object({
  action: z.enum(["approve", "deny"]),
  reviewNote: z.string().optional(),
});

/**
 * PATCH /api/superadmin/quota-requests/[id]
 * Review a quota request (approve or deny)
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, reviewNote } = ReviewSchema.parse(body);

    if (action === "approve") {
      await QuotaService.approveQuotaRequest(params.id, session.sub, reviewNote);
      return NextResponse.json({ message: "Quota request approved" });
    } else {
      if (!reviewNote) {
        return NextResponse.json({ error: "Review note is required for denial" }, { status: 400 });
      }
      await QuotaService.denyQuotaRequest(params.id, session.sub, reviewNote);
      return NextResponse.json({ message: "Quota request denied" });
    }
  } catch (error: any) {
    console.error("Error reviewing quota request:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

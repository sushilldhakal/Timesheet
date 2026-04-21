import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/config/roles";
import { OrgSignupService } from "@/lib/services/org-signup/org-signup-service";

/**
 * PATCH /api/superadmin/org-requests/[id]
 * Approve or reject an org signup request (superadmin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, reviewNote } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (action === "reject" && (!reviewNote || reviewNote.trim().length === 0)) {
      return NextResponse.json(
        { error: "Review note is required for rejection" },
        { status: 400 }
      );
    }

    const requestId = params.id;

    if (action === "approve") {
      const result = await OrgSignupService.approveRequest(
        requestId,
        session.sub,
        reviewNote
      );

      return NextResponse.json({
        message: "Request approved successfully",
        employerId: result.employerId,
        userId: result.userId,
      });
    } else {
      await OrgSignupService.rejectRequest(requestId, session.sub, reviewNote);

      return NextResponse.json({
        message: "Request rejected successfully",
      });
    }
  } catch (error: any) {
    console.error("[org-requests PATCH]", error);

    // Handle specific error messages
    if (error.message?.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message?.includes("already been")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

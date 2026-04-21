import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isAdminOrSuperAdmin } from "@/lib/config/roles";
import { QuotaService } from "@/lib/services/superadmin/quota-service";
import { QuotaRequestRepo } from "@/lib/db/queries/quota-request";
import { z } from "zod";

const QuotaRequestSchema = z.object({
  requestType: z.enum(["storage", "email"]),
  requestedQuota: z.number().positive(),
  requestNote: z.string().optional(),
});

/**
 * GET /api/admin/quota-requests
 * List quota requests for current organization
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

    const requests = await QuotaRequestRepo.findByOrgId(orgId);

    const formatted = requests.map((req) => ({
      id: req._id.toString(),
      requestType: req.requestType,
      currentQuota: req.currentQuota,
      requestedQuota: req.requestedQuota,
      requestNote: req.requestNote,
      status: req.status,
      reviewedBy: req.reviewedBy?.toString(),
      reviewedAt: req.reviewedAt,
      reviewNote: req.reviewNote,
      createdAt: req.createdAt,
    }));

    return NextResponse.json({ requests: formatted });
  } catch (error: any) {
    console.error("Error fetching quota requests:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/quota-requests
 * Submit a new quota request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isAdminOrSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = session.tenantId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization ID not found" }, { status: 400 });
    }

    const body = await request.json();
    const validated = QuotaRequestSchema.parse(body);

    const quotaRequest = await QuotaService.submitQuotaRequest(orgId, session.sub, validated);

    return NextResponse.json({
      message: "Quota request submitted successfully",
      request: {
        id: quotaRequest._id.toString(),
        requestType: quotaRequest.requestType,
        requestedQuota: quotaRequest.requestedQuota,
        status: quotaRequest.status,
      },
    });
  } catch (error: any) {
    console.error("Error submitting quota request:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    if (error.message.includes("pending")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

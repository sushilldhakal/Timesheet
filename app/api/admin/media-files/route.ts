import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { isAdminOrSuperAdmin } from "@/lib/config/roles";
import { MediaFileRepo } from "@/lib/db/queries/media-file";
import { deleteFilesBeforeDate } from "@/lib/storage";
import { z } from "zod";

const DeleteBeforeDateSchema = z.object({
  beforeDate: z.string().datetime(),
});

/**
 * GET /api/admin/media-files?page=1&limit=50
 * List media files for current organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthFromCookie();
    if (!session || !isAdminOrSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = session.tenantId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization ID not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      MediaFileRepo.findByOrgId(orgId, {
        limit,
        skip,
        sort: { createdAt: -1 },
      }),
      MediaFileRepo.countByOrgId(orgId),
    ]);

    const formatted = files.map((file) => ({
      id: file._id.toString(),
      r2Key: file.r2Key,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      uploadedBy: file.uploadedBy.toString(),
      createdAt: file.createdAt,
    }));

    return NextResponse.json({
      files: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Error fetching media files:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/media-files
 * Delete all files before a specific date
 */
export async function DELETE(request: NextRequest) {
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
    const { beforeDate } = DeleteBeforeDateSchema.parse(body);

    const result = await deleteFilesBeforeDate(new Date(beforeDate), orgId);

    return NextResponse.json({
      message: "Files deleted successfully",
      deletedCount: result.deletedCount,
      freedBytes: result.freedBytes,
    });
  } catch (error: any) {
    console.error("Error deleting media files:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

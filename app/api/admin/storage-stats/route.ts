import { NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { QuotaService } from "@/lib/services/superadmin/quota-service"
import { MediaFileRepo } from "@/lib/db/queries/media-file"

/**
 * GET /api/admin/storage-stats
 * Get storage usage statistics from database
 */
export async function GET() {
  try {
    const session = await getAuthFromCookie()
    if (!session || !isAdminOrSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const orgId = session.tenantId
    if (!orgId) {
      return NextResponse.json({ error: "Organization ID not found" }, { status: 400 })
    }

    // Get quota info
    const quota = await QuotaService.getStorageQuota(orgId)
    
    // Get file count and recent files
    const [fileCount, recentFiles] = await Promise.all([
      MediaFileRepo.countByOrgId(orgId),
      MediaFileRepo.findByOrgId(orgId, { limit: 10, sort: { createdAt: -1 } }),
    ])

    const formatted = recentFiles.map((file) => ({
      id: file._id.toString(),
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      createdAt: file.createdAt,
    }))

    return NextResponse.json({
      usedBytes: quota.usedBytes,
      quotaBytes: quota.quotaBytes,
      fileCount,
      recentFiles: formatted,
    })
  } catch (error: any) {
    console.error("Error fetching storage stats:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

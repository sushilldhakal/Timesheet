import { NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  storageStatsResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema } from "@/lib/validations/auth"
import { storageStatsService } from "@/lib/services/admin/storage-stats-service"

const getStorageStats = createApiRoute({
  method: 'GET',
  path: '/api/admin/storage-stats',
  summary: 'Get storage usage statistics',
  description: 'Get storage usage statistics from the active storage provider (Cloudinary or R2)',
  tags: ['Admin'],
  security: 'adminAuth',
  responses: {
    200: storageStatsResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return { status: 403, data: { error: "Forbidden" } }
    }
    return {
      status: 200,
      data: await storageStatsService.getStats(),
    }
  }
})

export const GET = getStorageStats

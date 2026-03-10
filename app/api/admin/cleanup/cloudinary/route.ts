import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { deleteFilesOlderThanDate } from "@/lib/storage"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  cleanupRequestSchema,
  cloudinaryCleanupResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema } from "@/lib/validations/auth"

const cleanupCloudinary = createApiRoute({
  method: 'POST',
  path: '/api/admin/cleanup/cloudinary',
  summary: 'Delete Cloudinary images older than date',
  description: 'Delete images from Cloudinary storage that are older than the specified date (admin only)',
  tags: ['Admin'],
  security: 'adminAuth',
  request: {
    body: cleanupRequestSchema,
  },
  responses: {
    200: cloudinaryCleanupResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return { status: 403, data: { error: "Forbidden" } }
    }

    const { beforeDate } = body!

    const { deleted, errors } = await deleteFilesOlderThanDate(beforeDate, "timesheet")

    return { status: 200, data: { deleted, errors } }
  }
})

export const POST = cleanupCloudinary

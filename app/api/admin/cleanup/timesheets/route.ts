import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { connectDB, Timesheet } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  cleanupRequestSchema,
  timesheetsCleanupResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema } from "@/lib/validations/auth"

const cleanupTimesheets = createApiRoute({
  method: 'POST',
  path: '/api/admin/cleanup/timesheets',
  summary: 'Delete timesheet records older than date',
  description: 'Delete timesheet records from database that are older than the specified date (admin only)',
  tags: ['Admin'],
  security: 'adminAuth',
  request: {
    body: cleanupRequestSchema,
  },
  responses: {
    200: timesheetsCleanupResponseSchema,
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

    await connectDB()
    const result = await Timesheet.deleteMany({ date: { $lt: beforeDate } })

    return { status: 200, data: { deleted: result.deletedCount ?? 0 } }
  }
})

export const POST = cleanupTimesheets

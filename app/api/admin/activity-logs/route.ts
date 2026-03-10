import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { ActivityLog } from "@/lib/db/schemas/activity-log"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  activityLogQuerySchema,
  activityLogCreateSchema,
  activityLogsResponseSchema,
  activityLogCreateResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/admin/activity-logs',
  summary: 'Get activity logs',
  description: 'Get activity logs with pagination and filtering',
  tags: ['Admin'],
  security: 'adminAuth',
  request: {
    query: activityLogQuerySchema,
  },
  responses: {
    200: activityLogsResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    try {
      const auth = await getAuthFromCookie()
      if (!auth) {
        return {
          status: 401,
          data: { error: "Unauthorized" }
        };
      }
      if (!isAdminOrSuperAdmin(auth.role)) {
        return {
          status: 403,
          data: { error: "Forbidden" }
        };
      }

      const { category = "storage", limit = 10, page = 1 } = query || {};
      const skip = (page - 1) * limit;

      await connectDB()
      
      const logs = await ActivityLog.find({ category })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

      // Check if there are more logs
      const total = await ActivityLog.countDocuments({ category })
      const hasMore = skip + logs.length < total

      return {
        status: 200,
        data: {
          logs: logs.map(log => ({
            ...log,
            _id: (log as any)._id.toString(),
            createdAt: (log as any).createdAt.toISOString(),
            updatedAt: (log as any).updatedAt.toISOString(),
          })),
          hasMore,
          total,
          page
        }
      };
    } catch (error) {
      console.error("[GET /api/admin/activity-logs]", error)
      return {
        status: 500,
        data: { error: "Failed to fetch logs" }
      };
    }
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/admin/activity-logs',
  summary: 'Create activity log',
  description: 'Create a new activity log entry',
  tags: ['Admin'],
  security: 'adminAuth',
  request: {
    body: activityLogCreateSchema,
  },
  responses: {
    200: activityLogCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      const auth = await getAuthFromCookie()
      if (!auth) {
        return {
          status: 401,
          data: { error: "Unauthorized" }
        };
      }
      if (!isAdminOrSuperAdmin(auth.role)) {
        return {
          status: 403,
          data: { error: "Forbidden" }
        };
      }

      const { action, details, status, category = "storage" } = body!;

      await connectDB()
      
      const log = await ActivityLog.create({
        action,
        details,
        status,
        userId: auth.sub,
        category,
      })

      return {
        status: 200,
        data: {
          log: {
            ...log.toObject(),
            _id: log._id.toString(),
            createdAt: log.createdAt.toISOString(),
            updatedAt: log.updatedAt.toISOString(),
          }
        }
      };
    } catch (error) {
      console.error("[POST /api/admin/activity-logs]", error)
      return {
        status: 500,
        data: { error: "Failed to create log" }
      };
    }
  }
});

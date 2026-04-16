import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  activityLogQuerySchema,
  activityLogCreateSchema,
  activityLogsResponseSchema,
  activityLogCreateResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema } from "@/lib/validations/auth"
import { activityLogsService } from "@/lib/services/admin/activity-logs-service"

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

      return {
        status: 200,
        data: await activityLogsService.list(query),
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

      return {
        status: 200,
        data: await activityLogsService.create(auth, body),
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

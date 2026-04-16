import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  mailSettingsUpdateSchema,
  mailSettingsResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth"
import { mailSettingsService } from "@/lib/services/admin/mail-settings-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/admin/mail-settings',
  summary: 'Get mail settings',
  description: 'Get current mail configuration settings',
  tags: ['Admin'],
  security: 'adminAuth',
  responses: {
    200: mailSettingsResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
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
        data: await mailSettingsService.get(),
      };
    } catch (error) {
      console.error("[GET /api/admin/mail-settings]", error)
      return {
        status: 500,
        data: { error: "Failed to fetch settings" }
      };
    }
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/admin/mail-settings',
  summary: 'Update mail settings',
  description: 'Update mail configuration settings',
  tags: ['Admin'],
  security: 'adminAuth',
  request: {
    body: mailSettingsUpdateSchema,
  },
  responses: {
    200: successResponseSchema,
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

      const { apiKey, fromEmail, fromName } = body!;

      return {
        status: 200,
        data: await mailSettingsService.save(body),
      };
    } catch (error) {
      console.error("[POST /api/admin/mail-settings]", error)
      return {
        status: 500,
        data: { error: "Failed to save settings" }
      };
    }
  }
});
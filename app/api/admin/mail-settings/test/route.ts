import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  mailTestSchema,
  mailTestResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema } from "@/lib/validations/auth"
import { mailSettingsService } from "@/lib/services/admin/mail-settings-service"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/admin/mail-settings/test',
  summary: 'Test mail settings',
  description: 'Send a test email to verify mail configuration',
  tags: ['Admin'],
  security: 'adminAuth',
  request: {
    body: mailTestSchema,
  },
  responses: {
    200: mailTestResponseSchema,
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

      const { testEmail } = body!;
      return await mailSettingsService.sendTest(testEmail)
    } catch (error: any) {
      console.error("[POST /api/admin/mail-settings/test]", error)
      return {
        status: 500,
        data: { error: error.message || "Test failed" }
      };
    }
  }
});
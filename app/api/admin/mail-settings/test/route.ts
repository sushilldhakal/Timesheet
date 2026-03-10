import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  mailTestSchema,
  mailTestResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema } from "@/lib/validations/auth"

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

      await connectDB()
      const { default: mongoose } = await import("mongoose")
      
      const MailSettings = mongoose.models.MailSettings || mongoose.model("MailSettings", new mongoose.Schema({
        type: { type: String, default: "mail" },
        fromEmail: String,
        fromName: String,
        apiKey: String,
        updatedAt: Date,
      }))

      const doc = await MailSettings.findOne({ type: "mail" })

      if (!doc?.apiKey) {
        return {
          status: 400,
          data: { error: "Mail settings not configured" }
        };
      }

      const res = await fetch("https://smtp.maileroo.com/api/v2/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${doc.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: {
            address: doc.fromEmail,
            display_name: doc.fromName || "Timesheet App",
          },
          to: [{ address: testEmail }],
          subject: "Maileroo Test Email",
          html: "<h2>✅ Mail settings working!</h2><p>Your Maileroo API is configured correctly.</p>",
          plain: "Mail settings working! Your Maileroo API is configured correctly.",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        return {
          status: 500,
          data: { error: data?.message || JSON.stringify(data) }
        };
      }

      return {
        status: 200,
        data: { success: true, message: "Test email sent successfully!" }
      };
    } catch (error: any) {
      console.error("[POST /api/admin/mail-settings/test]", error)
      return {
        status: 500,
        data: { error: error.message || "Test failed" }
      };
    }
  }
});
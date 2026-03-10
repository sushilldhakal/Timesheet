import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  mailSettingsUpdateSchema,
  mailSettingsResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth"

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

      if (!doc) {
        return {
          status: 200,
          data: { settings: null }
        };
      }

      return {
        status: 200,
        data: {
          settings: {
            fromEmail: doc.fromEmail || "",
            fromName: doc.fromName || "",
            hasApiKey: !!doc.apiKey,
          },
        }
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

      await connectDB()
      const { default: mongoose } = await import("mongoose")
      
      const MailSettings = mongoose.models.MailSettings || mongoose.model("MailSettings", new mongoose.Schema({
        type: { type: String, default: "mail" },
        fromEmail: String,
        fromName: String,
        apiKey: String,
        updatedAt: Date,
      }))

      const update: any = {
        type: "mail",
        fromEmail,
        fromName: fromName || "",
        updatedAt: new Date(),
      }

      // Only update apiKey if a new one was provided
      if (apiKey) update.apiKey = apiKey

      await MailSettings.updateOne(
        { type: "mail" },
        { $set: update },
        { upsert: true }
      )

      return {
        status: 200,
        data: { success: true }
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
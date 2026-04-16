import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { storageTestConnectionService } from "@/lib/services/admin/storage-test-connection-service"

// Request schema
const testConnectionRequestSchema = z.object({
  provider: z.enum(["r2", "cloudinary"]),
  credentials: z.record(z.string(), z.any())
})

// Response schemas
const testConnectionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
})

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

/** POST /api/admin/storage-settings/test-connection - Test storage provider connection */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/admin/storage-settings/test-connection',
  summary: 'Test storage provider connection',
  description: 'Test connection to storage provider (R2 or Cloudinary)',
  tags: ['admin'],
  security: 'adminAuth',
  request: {
    body: testConnectionRequestSchema
  },
  responses: {
    200: testConnectionResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      const auth = await getAuthFromCookie()
      if (!auth) {
        return { status: 401, data: { error: "Unauthorized" } }
      }
      if (!isAdminOrSuperAdmin(auth.role)) {
        return { status: 403, data: { error: "Forbidden" } }
      }

      const { provider, credentials } = body!

      return await storageTestConnectionService.test(provider, credentials)
    } catch (error) {
      console.error("Connection test failed:", error)
      return { status: 500, data: { error: "Connection test failed" } }
    }
  }
});

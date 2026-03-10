import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { StorageSettings } from "@/lib/db/schemas/storage-settings"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

// Response schemas
const resetResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
})

const errorResponseSchema = z.object({
  error: z.string()
})

/** DELETE /api/admin/storage-settings/reset - Clear all storage settings (for migration) */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/admin/storage-settings/reset',
  summary: 'Clear all storage settings',
  description: 'Clear all storage settings for migration purposes',
  tags: ['admin'],
  security: 'adminAuth',
  responses: {
    200: resetResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    try {
      const auth = await getAuthFromCookie()
      if (!auth) {
        return { status: 401, data: { error: "Unauthorized" } }
      }
      if (!isAdminOrSuperAdmin(auth.role)) {
        return { status: 403, data: { error: "Forbidden" } }
      }

      await connectDB()
      await StorageSettings.deleteMany({})

      return { 
        status: 200, 
        data: { 
          success: true, 
          message: "All storage settings cleared. Please re-enter your credentials." 
        } 
      }
    } catch (error) {
      console.error("[DELETE /api/admin/storage-settings/reset]", error)
      return { status: 500, data: { error: "Failed to reset settings" } }
    }
  }
});

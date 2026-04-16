import { adminCreateSchema } from "@/lib/validations/user"
import { createApiRoute } from "@/lib/api/create-api-route"
import { adminCreateResponseSchema } from "@/lib/validations/setup"
import { setupAdminService } from "@/lib/services/setup/setup-admin-service"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/setup/create-admin',
  summary: 'Create admin user',
  description: 'Create the initial admin user during setup',
  tags: ['Setup'],
  security: 'none',
  request: {
    body: adminCreateSchema,
  },
  responses: {
    200: adminCreateResponseSchema,
    400: adminCreateResponseSchema,
    409: adminCreateResponseSchema,
    500: adminCreateResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      return await setupAdminService.createAdmin(body)
    } catch (err) {
      console.error("[setup/create-admin]", err)
      return {
        status: 500,
        data: { success: false, error: "Failed to create admin" }
      };
    }
  }
});

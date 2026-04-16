import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { userCreateSchema, usersListResponseSchema, userCreateResponseSchema } from "@/lib/validations/user"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { userService } from "@/lib/services/user/user-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/users',
  summary: 'List users',
  description: 'List users based on caller scope. Admin/super_admin see all (except super_admin), manager sees supervisors in their locations, supervisor/accounts see nothing.',
  tags: ['Users'],
  security: 'adminAuth',
  responses: {
    200: usersListResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }
    const result = await userService.listUsers({ ctx })
    return { status: 200, data: result }
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/users',
  summary: 'Create user',
  description: 'Create user (admin only)',
  tags: ['Users'],
  security: 'adminAuth',
  request: {
    body: userCreateSchema,
  },
  responses: {
    200: userCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }
    const result = await userService.createUser({ ctx, body: body! })
    return { status: 200, data: result }
  }
});

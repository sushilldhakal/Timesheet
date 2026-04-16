import type { Right } from "@/lib/config/rights"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { 
  userIdParamSchema, 
  userAdminUpdateSchema, 
  userSelfUpdateSchema,
  singleUserResponseSchema,
  userUpdateResponseSchema,
  userDeleteResponseSchema,
} from "@/lib/validations/user"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { userService } from "@/lib/services/user/user-service"

/** GET /api/users/[id] - Get single user (admin or self) */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/users/{id}',
  summary: 'Get single user',
  description: 'Get single user (admin or self)',
  tags: ['users'],
  security: 'adminAuth',
  request: {
    params: userIdParamSchema
  },
  responses: {
    200: singleUserResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    const result = await userService.getUser({ ctx, id: params!.id })
    return { status: 200, data: result }
  }
});

/** PATCH /api/users/[id] - Update user */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/users/{id}',
  summary: 'Update user',
  description: 'Update user (admin or self)',
  tags: ['users'],
  security: 'adminAuth',
  request: {
    params: userIdParamSchema,
    body: userAdminUpdateSchema.or(userSelfUpdateSchema)
  },
  responses: {
    200: userUpdateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    const result = await userService.updateUser({ ctx, id: params!.id, body })
    return { status: 200, data: result }
  }
});

/** DELETE /api/users/[id] - Delete user (admin only) */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/users/{id}',
  summary: 'Delete user',
  description: 'Delete user (admin only)',
  tags: ['users'],
  security: 'adminAuth',
  request: {
    params: userIdParamSchema
  },
  responses: {
    200: userDeleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    const result = await userService.deleteUser({ ctx, id: params!.id })
    return { status: 200, data: result }
  }
});

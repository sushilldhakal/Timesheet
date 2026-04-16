import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/me',
  summary: 'Get current user context',
  description: 'Returns current authenticated user and their default tenant/employer',
  tags: ['Auth'],
  security: 'adminAuth',
  responses: {
    200: z.object({
      user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string().optional(),
      }),
      tenantId: z.string(),
      locations: z.array(z.string()).optional(),
    }),
    401: z.object({ error: z.string() }),
  },
  handler: async () => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx?.tenantId) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    return {
      status: 200,
      data: {
        user: {
          id: String(ctx.auth.sub),
          email: ctx.auth.email || "",
          name: ctx.auth.name,
        },
        tenantId: ctx.tenantId?.toString() || "",
        locations: ctx.userLocations ?? [],
      }
    }
  }
})

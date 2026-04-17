import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { apiKeyService } from "@/lib/services/api-keys/api-key-service"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/admin/api-keys/{id}",
  summary: "Revoke API key",
  description: "Revoke (deactivate) an API key",
  tags: ["Admin", "API Keys"],
  security: "adminAuth",
  request: {
    params: paramsSchema,
  },
  responses: {
    200: z.object({ message: z.string() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ params }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    await apiKeyService.revoke(ctx, params!.id)
    return { status: 200, data: { message: "API key revoked" } }
  },
})

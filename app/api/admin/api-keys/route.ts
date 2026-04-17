import { getTenantContext } from "@/lib/auth/tenant-context"
import { createApiRoute } from "@/lib/api/create-api-route"
import { apiKeyService } from "@/lib/services/api-keys/api-key-service"
import { z } from "zod"

const bodySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(
    z.enum([
      "employees:read",
      "employees:write",
      "shifts:read",
      "shifts:write",
      "timesheets:read",
      "rosters:read",
      "payroll:read",
      "webhooks:manage",
    ])
  ),
  expiresAt: z.string().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/admin/api-keys",
  summary: "List API keys",
  description: "List all active API keys for the tenant",
  tags: ["Admin", "API Keys"],
  security: "adminAuth",
  responses: {
    200: z.object({ keys: z.array(z.any()) }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async () => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const keys = await apiKeyService.list(ctx)
    return { status: 200, data: { keys } }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/admin/api-keys",
  summary: "Create API key",
  description:
    "Create a new API key. The plaintext key is returned ONCE and never stored — save it immediately.",
  tags: ["Admin", "API Keys"],
  security: "adminAuth",
  request: {
    body: bodySchema,
  },
  responses: {
    201: z.object({ key: z.string(), record: z.any() }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body }) => {
    const ctx = await getTenantContext()
    if (!ctx || ctx.type !== "full") {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const result = await apiKeyService.create(ctx, {
      name: body!.name,
      scopes: body!.scopes,
      expiresAt: body!.expiresAt ? new Date(body!.expiresAt) : undefined,
    })

    return { status: 201, data: result }
  },
})

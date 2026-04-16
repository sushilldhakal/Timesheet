import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import AwardTag from "@/lib/db/schemas/award-tag"
import { scope } from "@/lib/db/tenant-model"

const awardTagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/award-tags",
  summary: "List award tags",
  description: "Get award tag options for timesheet overrides",
  tags: ["Awards"],
  security: "adminAuth",
  responses: {
    200: z.object({ awardTags: z.array(awardTagResponseSchema) }),
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx?.tenantId) return { status: 401, data: { error: "Unauthorized" } }

    const AwardTagScoped = scope(AwardTag as any, ctx.tenantId)
    const docs = await AwardTagScoped.find({ isActive: true })
      .select({ _id: 1, name: 1, description: 1, color: 1, isActive: 1 })
      .sort({ name: 1 })
      .lean()

    return {
      status: 200,
      data: {
        awardTags: docs.map((d: any) => ({
          id: String(d._id),
          name: String(d.name ?? ""),
          description: d.description ? String(d.description) : undefined,
          color: d.color ? String(d.color) : undefined,
          isActive: Boolean(d.isActive),
        })),
      },
    }
  },
})


import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { teamGroupService } from "@/lib/services/team/team-group-service"

const teamGroupResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
})

const teamGroupUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/team-groups/[id]",
  summary: "Get team group",
  description: "Get a specific team group by ID",
  tags: ["Team Groups"],
  security: "adminAuth",
  responses: {
    200: z.object({ teamGroup: teamGroupResponseSchema }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const result = await teamGroupService.getTeamGroup({ tenantId: ctx.tenantId, id: params?.id as string })
    return { status: 200, data: result }
  },
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/team-groups/[id]",
  summary: "Update team group",
  description: "Update a specific team group",
  tags: ["Team Groups"],
  security: "adminAuth",
  request: { body: teamGroupUpdateSchema },
  responses: {
    200: z.object({ teamGroup: teamGroupResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const result = await teamGroupService.updateTeamGroup({ tenantId: ctx.tenantId, id: params?.id as string, body: body! })
    return { status: 200, data: result }
  },
})

export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/team-groups/[id]",
  summary: "Delete team group",
  description: "Delete a team group (only if no teams are assigned)",
  tags: ["Team Groups"],
  security: "adminAuth",
  responses: {
    200: z.object({ success: z.boolean() }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const result = await teamGroupService.deleteTeamGroup({ tenantId: ctx.tenantId, id: params?.id as string })
    return { status: 200, data: result }
  },
})

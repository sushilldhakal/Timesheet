import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { teamService } from "@/lib/services/team/team-service"

const teamUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().optional(),
  color: z.string().optional(),
  groupId: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
})

const teamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  color: z.string().optional(),
  groupId: z.string().optional(),
  order: z.number().optional(),
  groupName: z.string().optional(),
  groupColor: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/teams/[id]",
  summary: "Update team",
  description: "Update a scheduling team's properties including order for reordering",
  tags: ["Teams"],
  security: "adminAuth",
  request: {
    params: z.object({ id: z.string() }),
    body: teamUpdateSchema,
  },
  responses: {
    200: z.object({ team: teamResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const { id } = params!
    const result = await teamService.updateTeam({ tenantId: ctx.tenantId, id, body: body! })
    return { status: 200, data: result }
  },
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/teams/[id]",
  summary: "Get team",
  description: "Get a single scheduling team by ID",
  tags: ["Teams"],
  security: "adminAuth",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: z.object({ team: teamResponseSchema }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const { id } = params!
    const result = await teamService.getTeam({ tenantId: ctx.tenantId, id })
    return { status: 200, data: result }
  },
})

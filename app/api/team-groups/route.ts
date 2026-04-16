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

const teamGroupQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional().transform((val) => val ? val === "true" : undefined),
})

const teamGroupCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/team-groups",
  summary: "List team groups",
  description: "Get all team groups, optionally filtered",
  tags: ["Team Groups"],
  security: "adminAuth",
  request: { query: teamGroupQuerySchema },
  responses: {
    200: z.object({ teamGroups: z.array(teamGroupResponseSchema) }),
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const result = await teamGroupService.listTeamGroups({ tenantId: ctx.tenantId, query })
    return { status: 200, data: result }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/team-groups",
  summary: "Create team group",
  description: "Create a new team group",
  tags: ["Team Groups"],
  security: "adminAuth",
  request: { body: teamGroupCreateSchema },
  responses: {
    200: z.object({ teamGroup: teamGroupResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const result = await teamGroupService.createTeamGroup({ tenantId: ctx.tenantId, body: body! })
    return { status: 200, data: result }
  },
})

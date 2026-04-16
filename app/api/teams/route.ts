import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { teamService } from "@/lib/services/team/team-service"

const shiftPatternSchema = z.object({
  dayOfWeek: z.array(z.number()).optional(),
  startHour: z.number().optional(),
  endHour: z.number().optional(),
  description: z.string().optional(),
})

const defaultScheduleTemplateSchema = z.object({
  standardHoursPerWeek: z.number().optional(),
  shiftPattern: shiftPatternSchema.optional(),
})

const groupSnapshotResponseSchema = z.object({ name: z.string().optional() }).optional()

const teamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  color: z.string().optional(),
  groupId: z.string().optional(),
  order: z.number().optional(),
  groupSnapshot: groupSnapshotResponseSchema,
  groupName: z.string().optional(),
  groupColor: z.string().optional(),
  staffCount: z.number().optional(),
  managerCount: z.number().optional(),
  defaultScheduleTemplate: defaultScheduleTemplateSchema.optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
})

const teamQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional().transform((val) => val ? val === "true" : undefined),
})

const teamCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  color: z.string().optional(),
  groupId: z.string().optional(),
  order: z.number().optional(),
  defaultScheduleTemplate: defaultScheduleTemplateSchema.optional(),
  isActive: z.boolean().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/teams",
  summary: "List teams",
  description: "Get all scheduling teams, optionally filtered",
  tags: ["Teams"],
  security: "adminAuth",
  request: { query: teamQuerySchema },
  responses: {
    200: z.object({ teams: z.array(teamResponseSchema) }),
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const result = await teamService.listTeams({ tenantId: ctx.tenantId, query })
    return { status: 200, data: result }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/teams",
  summary: "Create team",
  description: "Create a new scheduling team",
  tags: ["Teams"],
  security: "adminAuth",
  request: { body: teamCreateSchema },
  responses: {
    200: z.object({ team: teamResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const result = await teamService.createTeam({ tenantId: ctx.tenantId, userId: ctx.auth.sub, body: body! })
    return { status: 200, data: result }
  },
})

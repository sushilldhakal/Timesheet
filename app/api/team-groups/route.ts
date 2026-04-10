import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, TeamGroup } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"

const teamGroupResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
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
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const search = query?.search?.trim()
    const isActive = query?.isActive

    await connectDB()
    const filter: Record<string, unknown> = {}
    if (typeof isActive === "boolean") filter.isActive = isActive
    if (search) filter.name = { $regex: search, $options: "i" }

    const teamGroups = await TeamGroup.find(filter).sort({ name: 1 }).lean()

    return {
      status: 200,
      data: {
        teamGroups: teamGroups.map((group: any) => ({
          id: group._id.toString(),
          name: group.name,
          description: group.description,
          color: group.color,
          isActive: group.isActive ?? true,
          createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : null,
          updatedAt: group.updatedAt ? new Date(group.updatedAt).toISOString() : null,
        })),
      },
    }
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
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const payload = body!
    await connectDB()

    const existing = await TeamGroup.findOne({
      name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
    }).lean()
    if (existing) return { status: 409, data: { error: "A team group with this name already exists" } }

    const created = await TeamGroup.create({
      ...payload,
      name: payload.name.trim(),
    })

    return {
      status: 200,
      data: {
        teamGroup: {
          id: created._id.toString(),
          name: created.name,
          description: created.description,
          color: created.color,
          isActive: created.isActive ?? true,
          createdAt: created.createdAt ? created.createdAt.toISOString() : null,
          updatedAt: created.updatedAt ? created.updatedAt.toISOString() : null,
        },
      },
    }
  },
})

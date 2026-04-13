import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, TeamGroup } from "@/lib/db"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"

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

    const search = query?.search?.trim()
    const isActive = query?.isActive

    await connectDB()
    const tid = new mongoose.Types.ObjectId(ctx.tenantId)
    const filter: Record<string, unknown> = { tenantId: tid }
    if (typeof isActive === "boolean") filter.isActive = isActive
    if (search) filter.name = { $regex: search, $options: "i" }

    const teamGroups = await TeamGroup.find(filter).sort({ order: 1, name: 1 }).lean()

    return {
      status: 200,
      data: {
        teamGroups: teamGroups.map((group: any) => ({
          id: group._id.toString(),
          name: group.name,
          description: group.description,
          color: group.color,
          order: group.order ?? 0,
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
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    const payload = body!
    const tid = new mongoose.Types.ObjectId(ctx.tenantId)
    await connectDB()

    const existing = await TeamGroup.findOne({
      tenantId: tid,
      name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
    }).lean()
    if (existing) return { status: 409, data: { error: "A team group with this name already exists" } }

    const created = await TeamGroup.create({
      ...payload,
      tenantId: tid,
      name: payload.name.trim(),
      order: payload.order ?? 0,
    })

    return {
      status: 200,
      data: {
        teamGroup: {
          id: created._id.toString(),
          name: created.name,
          description: created.description,
          color: created.color,
          order: created.order ?? 0,
          isActive: created.isActive ?? true,
          createdAt: created.createdAt ? created.createdAt.toISOString() : null,
          updatedAt: created.updatedAt ? created.updatedAt.toISOString() : null,
        },
      },
    }
  },
})

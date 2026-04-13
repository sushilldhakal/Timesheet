import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, mongoose, Team } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"

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

    const { id } = params
    const payload = body!

    await connectDB()
    const tid = new mongoose.Types.ObjectId(ctx.tenantId)

    // Verify the team exists and belongs to this tenant
    const team = await Team.findOne({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: tid,
    })

    if (!team) return { status: 404, data: { error: "Team not found" } }

    // Check if name is being changed - ensure uniqueness
    if (payload.name && payload.name.trim() !== team.name) {
      const existing = await Team.findOne({
        tenantId: tid,
        name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
        _id: { $ne: team._id },
      }).lean()
      if (existing) {
        return { status: 400, data: { error: "A team with this name already exists" } }
      }
    }

    // Update the team
    const updatedTeam = await Team.findByIdAndUpdate(
      team._id,
      {
        ...(payload.name && { name: payload.name.trim() }),
        ...(payload.code !== undefined && { code: payload.code || undefined }),
        ...(payload.color !== undefined && { color: payload.color || undefined }),
        ...(payload.groupId !== undefined && {
          groupId: payload.groupId && mongoose.Types.ObjectId.isValid(payload.groupId)
            ? new mongoose.Types.ObjectId(payload.groupId)
            : undefined,
        }),
        ...(payload.order !== undefined && { order: payload.order }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
      },
      { new: true }
    ).lean()

    if (!updatedTeam) {
      return { status: 404, data: { error: "Failed to update team" } }
    }

    // Fetch group info if exists
    let groupName: string | undefined
    let groupColor: string | undefined
    if (updatedTeam.groupId) {
      const { TeamGroup } = await import("@/lib/db/schemas/team-group")
      const g = await TeamGroup.findById(updatedTeam.groupId).select(["name", "color"]).lean()
      if (g) {
        groupName = g.name
        groupColor = g.color
      }
    }

    return {
      status: 200,
      data: {
        team: {
          id: updatedTeam._id.toString(),
          name: updatedTeam.name,
          code: updatedTeam.code,
          color: updatedTeam.color,
          groupId: updatedTeam.groupId?.toString(),
          order: updatedTeam.order ?? 0,
          groupName,
          groupColor,
          isActive: updatedTeam.isActive ?? true,
          createdAt: updatedTeam.createdAt ? new Date(updatedTeam.createdAt).toISOString() : null,
          updatedAt: updatedTeam.updatedAt ? new Date(updatedTeam.updatedAt).toISOString() : null,
        },
      },
    }
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

    const { id } = params

    await connectDB()
    const tid = new mongoose.Types.ObjectId(ctx.tenantId)

    const team = await Team.findOne({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: tid,
    }).lean()

    if (!team) return { status: 404, data: { error: "Team not found" } }

    // Fetch group info if exists
    let groupName: string | undefined
    let groupColor: string | undefined
    if (team.groupId) {
      const { TeamGroup } = await import("@/lib/db/schemas/team-group")
      const g = await TeamGroup.findById(team.groupId).select(["name", "color"]).lean()
      if (g) {
        groupName = g.name
        groupColor = g.color
      }
    }

    return {
      status: 200,
      data: {
        team: {
          id: team._id.toString(),
          name: team.name,
          code: team.code,
          color: team.color,
          groupId: team.groupId?.toString(),
          order: team.order ?? 0,
          groupName,
          groupColor,
          isActive: team.isActive ?? true,
          createdAt: team.createdAt ? new Date(team.createdAt).toISOString() : null,
          updatedAt: team.updatedAt ? new Date(team.updatedAt).toISOString() : null,
        },
      },
    }
  },
})

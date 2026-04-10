import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, mongoose, TeamGroup, Team } from "@/lib/db"
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

const teamGroupUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  color: z.string().optional(),
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
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const id = params?.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return { status: 400, data: { error: "Invalid team group ID" } }
    }

    await connectDB()
    const teamGroup = await TeamGroup.findById(id).lean()

    if (!teamGroup) {
      return { status: 404, data: { error: "Team group not found" } }
    }

    return {
      status: 200,
      data: {
        teamGroup: {
          id: teamGroup._id.toString(),
          name: teamGroup.name,
          description: teamGroup.description,
          color: teamGroup.color,
          isActive: teamGroup.isActive ?? true,
          createdAt: teamGroup.createdAt ? new Date(teamGroup.createdAt).toISOString() : null,
          updatedAt: teamGroup.updatedAt ? new Date(teamGroup.updatedAt).toISOString() : null,
        },
      },
    }
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
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const id = params?.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return { status: 400, data: { error: "Invalid team group ID" } }
    }

    await connectDB()
    const payload = body!

    // Check if name is being updated and if it's unique
    if (payload.name) {
      const existing = await TeamGroup.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
      }).lean()
      if (existing) {
        return { status: 409, data: { error: "A team group with this name already exists" } }
      }
    }

    const updated = await TeamGroup.findByIdAndUpdate(
      id,
      { ...payload, ...(payload.name && { name: payload.name.trim() }) },
      { new: true, runValidators: true }
    ).lean()

    if (!updated) {
      return { status: 404, data: { error: "Team group not found" } }
    }

    return {
      status: 200,
      data: {
        teamGroup: {
          id: updated._id.toString(),
          name: updated.name,
          description: updated.description,
          color: updated.color,
          isActive: updated.isActive ?? true,
          createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : null,
          updatedAt: updated.updatedAt ? new Date(updated.updatedAt).toISOString() : null,
        },
      },
    }
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
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const id = params?.id
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return { status: 400, data: { error: "Invalid team group ID" } }
    }

    await connectDB()

    // Check if any teams are assigned to this group
    const assignedTeams = await Team.countDocuments({ groupId: id })
    if (assignedTeams > 0) {
      return {
        status: 409,
        data: {
          error: `Cannot delete this team group. ${assignedTeams} team(s) are assigned to it. Please reassign them first.`,
        },
      }
    }

    const result = await TeamGroup.findByIdAndDelete(id)
    if (!result) {
      return { status: 404, data: { error: "Team group not found" } }
    }

    return {
      status: 200,
      data: { success: true },
    }
  },
})

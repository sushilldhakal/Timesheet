import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Team } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import mongoose from "mongoose"

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

const teamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  color: z.string().optional(),
  groupId: z.string().optional(),
  defaultScheduleTemplate: defaultScheduleTemplateSchema.optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
})

const teamUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().optional(),
  color: z.string().optional(),
  groupId: z.string().optional(),
  defaultScheduleTemplate: defaultScheduleTemplateSchema.optional(),
  isActive: z.boolean().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/teams/{id}",
  summary: "Get team",
  description: "Get a single team by ID",
  tags: ["Teams"],
  security: "adminAuth",
  responses: {
    200: z.object({ team: teamResponseSchema }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const { id } = params as { id: string }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 404, data: { error: "Invalid team ID" } }
    }

    await connectDB()
    const team = await Team.findById(id).lean()
    if (!team) return { status: 404, data: { error: "Team not found" } }

    return {
      status: 200,
      data: {
        team: {
          id: team._id.toString(),
          name: team.name,
          code: team.code,
          color: team.color,
          groupId: team.groupId?.toString(),
          defaultScheduleTemplate: team.defaultScheduleTemplate,
          isActive: team.isActive ?? true,
          createdAt: team.createdAt ? new Date(team.createdAt).toISOString() : null,
          updatedAt: team.updatedAt ? new Date(team.updatedAt).toISOString() : null,
        },
      },
    }
  },
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/teams/{id}",
  summary: "Update team",
  description: "Update a team by ID",
  tags: ["Teams"],
  security: "adminAuth",
  request: { body: teamUpdateSchema },
  responses: {
    200: z.object({ team: teamResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const { id } = params as { id: string }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 404, data: { error: "Invalid team ID" } }
    }

    const payload = body!
    await connectDB()

    const team = await Team.findById(id)
    if (!team) return { status: 404, data: { error: "Team not found" } }

    if (payload.name && payload.name.trim() !== team.name) {
      const existing = await Team.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
      }).lean()
      if (existing) return { status: 409, data: { error: "A team with this name already exists" } }
    }

    if (payload.name !== undefined) team.name = payload.name.trim()
    if (payload.code !== undefined) team.code = payload.code
    if (payload.color !== undefined) team.color = payload.color
    if (payload.groupId !== undefined) team.groupId = payload.groupId
    if (payload.defaultScheduleTemplate !== undefined)
      team.defaultScheduleTemplate = payload.defaultScheduleTemplate
    if (payload.isActive !== undefined) team.isActive = payload.isActive

    await team.save()

    return {
      status: 200,
      data: {
        team: {
          id: team._id.toString(),
          name: team.name,
          code: team.code,
          color: team.color,
          groupId: team.groupId?.toString(),
          defaultScheduleTemplate: team.defaultScheduleTemplate,
          isActive: team.isActive ?? true,
          createdAt: team.createdAt ? team.createdAt.toISOString() : null,
          updatedAt: team.updatedAt ? team.updatedAt.toISOString() : null,
        },
      },
    }
  },
})

export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/teams/{id}",
  summary: "Delete team",
  description: "Delete a team by ID",
  tags: ["Teams"],
  security: "adminAuth",
  responses: {
    200: z.object({ success: z.boolean() }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const { id } = params as { id: string }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 404, data: { error: "Invalid team ID" } }
    }

    await connectDB()
    const team = await Team.findByIdAndDelete(id)
    if (!team) return { status: 404, data: { error: "Team not found" } }

    return {
      status: 200,
      data: { success: true },
    }
  },
})

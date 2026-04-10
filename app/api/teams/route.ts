import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Team } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { mongoose } from "@/lib/db"

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
  defaultScheduleTemplate: defaultScheduleTemplateSchema.optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
})

const teamQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional().transform((val) => val === "true"),
})

const teamCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  color: z.string().optional(),
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
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const search = query?.search?.trim()
    const isActive = query?.isActive

    await connectDB()
    const filter: Record<string, unknown> = {}
    if (typeof isActive === "boolean") filter.isActive = isActive
    if (search) filter.name = { $regex: search, $options: "i" }

    let teams = await Team.find(filter).sort({ name: 1 }).lean()

    // Backward/typo compatibility: some environments stored teams in `teans`.
    // If `teams` is empty but `teans` has docs, read from there.
    if (teams.length === 0) {
      try {
        const teansCount = await mongoose.connection.collection("teans").countDocuments({})
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("[api/teams GET] teams empty; teansCount=", teansCount)
        }
        if (teansCount > 0) {
          const teans = await mongoose.connection
            .collection("teans")
            .find(filter as any)
            .sort({ name: 1 } as any)
            .toArray()
          teams = teans as any
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("[api/teams GET] teans fallback failed", e)
        }
      }
    }
    return {
      status: 200,
      data: {
        teams: teams.map((r: any) => ({
          id: r._id.toString(),
          name: r.name,
          code: r.code,
          color: r.color,
          defaultScheduleTemplate: r.defaultScheduleTemplate,
          isActive: r.isActive ?? true,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
        })),
      },
    }
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
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const payload = body!
    await connectDB()

    const existing = await Team.findOne({
      name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
    }).lean()
    if (existing) return { status: 409, data: { error: "A team with this name already exists" } }

    const created = await Team.create({
      ...payload,
      name: payload.name.trim(),
      createdBy: auth.sub,
    })

    return {
      status: 200,
      data: {
        team: {
          id: created._id.toString(),
          name: created.name,
          code: created.code,
          color: created.color,
          defaultScheduleTemplate: created.defaultScheduleTemplate,
          isActive: created.isActive ?? true,
          createdAt: created.createdAt ? created.createdAt.toISOString() : null,
          updatedAt: created.updatedAt ? created.updatedAt.toISOString() : null,
        },
      },
    }
  },
})
